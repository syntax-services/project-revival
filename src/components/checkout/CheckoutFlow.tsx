import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, Truck, Zap, Store, Loader2, 
  CheckCircle, AlertCircle, CreditCard 
} from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  commissionPercent?: number;
}

interface CheckoutFlowProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  cartItems: CartItem[];
  onSuccess?: () => void;
}

interface CheckoutCustomer {
  id: string;
  street_address?: string;
  location_verified?: boolean;
  profiles?: {
    full_name: string | null;
    phone: string | null;
  };
}

interface InitializePaymentResponse {
  success: boolean;
  authorization_url?: string;
  access_code?: string;
  reference?: string;
  error?: string;
}

const DELIVERY_OPTIONS = [
  {
    id: "pickup",
    name: "Pickup",
    description: "Pick up from store",
    icon: Store,
    fee: 0,
    estimatedHours: null,
  },
  {
    id: "standard",
    name: "Standard Delivery",
    description: "Delivered within 1-2 days",
    icon: Truck,
    fee: 300,
    estimatedHours: 48,
  },
  {
    id: "express",
    name: "Express Delivery",
    description: "Same day delivery",
    icon: Zap,
    fee: 500,
    estimatedHours: 6,
  },
] as const;

type DeliveryType = "pickup" | "standard" | "express";

export function CheckoutFlow({ 
  isOpen, 
  onClose, 
  businessId, 
  businessName, 
  cartItems,
  onSuccess 
}: CheckoutFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "standard" | "express">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  // Fetch customer data
  const { data: customer } = useQuery<CheckoutCustomer>({
    queryKey: ["customer-checkout", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, profiles:user_id (full_name, phone)")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data as CheckoutCustomer;
    },
    enabled: !!user?.id,
  });

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = DELIVERY_OPTIONS.find(d => d.id === deliveryType)?.fee || 0;
  
  /**
   * String Platform Fee Model (MVP):
   *   - `commission_amount`: The platform's take. Calculated as weighted avg of per-item commission (default 10%).
   *   - `platform_fee`: Reserved for future fixed fees. Currently always 0 for product orders.
   *   - Total customer pays = subtotal + deliveryFee + commissionAmount.
   *   - Business receives = total - commission_amount - platform_fee (computed server-side by the settlement RPC).
   *   - The settlement RPCs (`settle_order_settlement`, `settle_job_settlement`) are the single source of truth
   *     for payout math. The client only sends the fee values; the DB functions enforce correctness.
   */
  const commissionAmountValue = cartItems.reduce((sum, item) => 
    sum + (item.price * item.quantity * (item.commissionPercent || 10) / 100), 0
  );
  const roundedCommission = Math.round(commissionAmountValue);
  const avgCommission = subtotal > 0 ? (commissionAmountValue / subtotal) * 100 : 10;

  const total = subtotal + deliveryFee + roundedCommission;

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!customer || !user?.email) {
        throw new Error("Please complete your profile first");
      }

      const { data, error } = await supabase.functions.invoke<InitializePaymentResponse>("initialize-payment", {
        body: {
          email: user.email,
          businessId,
          items: cartItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          subtotal,
          deliveryFee,
          total,
          deliveryType,
          deliveryAddress: deliveryType === "pickup" ? null : deliveryAddress.trim(),
          deliveryInstructions: deliveryInstructions.trim() || null,
          platformFee: 0,
          commissionAmount: roundedCommission,
          metadata: {
            business_name: businessName,
            customer_name: customer.profiles?.full_name ?? null,
          },
        },
      });

      if (error) throw error;
      if (!data?.success || !data.authorization_url) {
        throw new Error(data?.error || "Failed to get payment URL");
      }

      return data;
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to place order");
    },
  });

  // Initialize Paystack payment
  const initializePayment = async () => {
    if (!customer || !user?.email) {
      toast.error("Please complete your profile first");
      return;
    }

    if (deliveryType !== "pickup" && !deliveryAddress.trim()) {
      toast.error("Please enter your delivery address");
      return;
    }

    setProcessingPayment(true);

    try {
      const paymentSession = await createOrderMutation.mutateAsync();
      if (paymentSession.authorization_url) {
        window.location.assign(paymentSession.authorization_url);
      }
    } catch (error: unknown) {
      console.error("Payment error:", error);
      // mutateAsync onError handles toast
    } finally {
      setProcessingPayment(false);
    }
  };

  // Pre-fill address from customer data
  useEffect(() => {
    if (customer?.street_address) {
      setDeliveryAddress(customer.street_address);
    }
  }, [customer]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Checkout - {businessName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Review Cart */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium">Review Your Order</h3>
              
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex justify-between items-center py-2 border-b">
                    <div className="flex items-center gap-3">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded object-cover" />
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-medium">{'\u20A6'}{(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <Button onClick={() => setStep(2)} className="w-full">
                Continue to Delivery
              </Button>
            </div>
          )}

          {/* Step 2: Delivery Options */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium">Delivery Method</h3>
              
              <RadioGroup value={deliveryType} onValueChange={(val: DeliveryType) => setDeliveryType(val)}>
                {DELIVERY_OPTIONS.map((option) => (
                  <div
                    key={option.id}
                    className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      deliveryType === option.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => setDeliveryType(option.id)}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <option.icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <label htmlFor={option.id} className="cursor-pointer font-medium text-sm">
                        {option.name}
                      </label>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    <span className="font-medium">
                      {option.fee === 0 ? "Free" : `\u20A6${option.fee.toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </RadioGroup>

              {deliveryType !== "pickup" && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter your full address including landmarks"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                    />
                    {customer?.location_verified ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Address verified
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        Address pending verification
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="instructions">Delivery Instructions (Optional)</Label>
                    <Textarea
                      id="instructions"
                      placeholder="E.g., Call when you arrive, leave at reception"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment Summary */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium">Payment Summary</h3>
              
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{'\u20A6'}{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span>{deliveryFee === 0 ? "Free" : `\u20A6${deliveryFee.toLocaleString()}`}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Service Fee ({avgCommission.toFixed(0)}%)</span>
                    <span>{'\u20A6'}{roundedCommission.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₦{total.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Delivery:</strong>{" "}
                  {deliveryType === "pickup" 
                    ? "Pickup from store" 
                    : deliveryAddress}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={initializePayment} 
                  disabled={processingPayment || createOrderMutation.isPending}
                  className="flex-1"
                >
                  {processingPayment || createOrderMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                       Pay {'\u20A6'}{total.toLocaleString()}
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By placing this order, you agree to String's terms of service.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}