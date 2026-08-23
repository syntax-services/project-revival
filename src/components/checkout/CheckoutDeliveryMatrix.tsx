import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Truck, Store, CreditCard, Building, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StructuredLocationPicker } from "@/components/location/StructuredLocationPicker";
import { StructuredLocationSelection } from "@/hooks/useStructuredLocations";

interface CheckoutDeliveryMatrixProps {
  deliveryType: "standard" | "pickup";
  setDeliveryType: (val: "standard" | "pickup") => void;
  deliveryLocation: StructuredLocationSelection | null;
  setDeliveryLocation: (loc: StructuredLocationSelection | null) => void;
  address: string;
  setAddress: (val: string) => void;
  instructions: string;
  setInstructions: (val: string) => void;
  paymentMethod: "card" | "wallet" | "bank_transfer";
  setPaymentMethod: (val: "card" | "wallet" | "bank_transfer") => void;
  profile: {
    verification_level?: number | null;
    wallet_balance?: number | null;
  } | null;
  total: number;
}

export function CheckoutDeliveryMatrix({
  deliveryType,
  setDeliveryType,
  deliveryLocation,
  setDeliveryLocation,
  address,
  setAddress,
  instructions,
  setInstructions,
  paymentMethod,
  setPaymentMethod,
  profile,
  total,
}: CheckoutDeliveryMatrixProps) {
  const navigate = useNavigate();
  const isVerified = (profile?.verification_level || 0) >= 2;

  return (
    <div className="space-y-8 text-left">
      {/* Delivery Method Toggle */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Delivery Method</h2>
        <RadioGroup 
          value={deliveryType} 
          onValueChange={(val) => setDeliveryType(val as "standard" | "pickup")}
          className="grid grid-cols-2 gap-4"
        >
          <div>
            <RadioGroupItem value="standard" id="standard" className="peer sr-only" />
            <Label 
              htmlFor="standard" 
              className="flex flex-col items-center justify-center rounded-2xl border border-border/30 bg-card p-5 hover:bg-accent/40 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/[0.02] peer-data-[state=checked]:text-primary cursor-pointer transition-all duration-300"
            >
              <Truck className="mb-2.5 h-5 w-5" />
              <span className="text-xs font-bold">Delivery</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="pickup" id="pickup" className="peer sr-only" />
            <Label 
              htmlFor="pickup" 
              className="flex flex-col items-center justify-center rounded-2xl border border-border/30 bg-card p-5 hover:bg-accent/40 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/[0.02] peer-data-[state=checked]:text-primary cursor-pointer transition-all duration-300"
            >
              <Store className="mb-2.5 h-5 w-5" />
              <span className="text-xs font-bold">Store Pickup (Free)</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {deliveryType === "standard" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          {!isVerified && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-destructive space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider">Identity Verification Required</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                You must complete Level 2 identity verification (NIN/BVN) in your profile page before you can place orders for delivery.
              </p>
              <Button size="sm" variant="destructive" onClick={() => navigate("/customer/profile")} className="w-full font-bold text-xs h-8 rounded-xl">
                Go to Profile to Verify
              </Button>
            </div>
          )}

          <h2 className="text-lg font-bold tracking-tight text-foreground">Delivery Address</h2>
          <div className="space-y-4">
            <StructuredLocationPicker
              label="Delivery point"
              value={deliveryLocation}
              onChange={setDeliveryLocation}
              compact
            />
            <div className="space-y-2">
              <Label htmlFor="address" className="text-xs font-bold text-muted-foreground">Room / note beside landmark</Label>
              <Textarea 
                id="address" 
                placeholder="Room number, block, shop line, or who to call for pickup" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="resize-none rounded-xl border-border/20 bg-muted/30 focus-visible:bg-card focus-visible:ring-primary/20 transition-all min-h-[76px] text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions" className="text-xs font-bold text-muted-foreground">Delivery Instructions (Optional)</Label>
              <Input 
                id="instructions" 
                placeholder="e.g. Call upon arrival, drop at reception" 
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="rounded-xl border-border/20 bg-muted/30 focus-visible:bg-card focus-visible:ring-primary/20 transition-all h-11 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Selector */}
      <div className="space-y-4 pt-4 border-t border-border/10">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Payment Method</h2>
        <RadioGroup 
          value={paymentMethod} 
          onValueChange={(val) => setPaymentMethod(val as "card" | "wallet" | "bank_transfer")}
          className="grid grid-cols-3 gap-4"
        >
          <div>
            <RadioGroupItem value="card" id="card" className="peer sr-only" />
            <Label 
              htmlFor="card" 
              className="flex flex-col items-center justify-center rounded-2xl border border-border/30 bg-card p-4 hover:bg-accent/40 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/[0.02] peer-data-[state=checked]:text-primary cursor-pointer transition-all duration-300 h-full text-center"
            >
              <CreditCard className="h-5 w-5 mb-2 shrink-0" />
              <span className="text-xs font-bold leading-tight">Debit Card / USSD</span>
            </Label>
          </div>
          
          <div>
            <RadioGroupItem value="bank_transfer" id="bank_transfer" className="peer sr-only" />
            <Label 
              htmlFor="bank_transfer" 
              className="flex flex-col items-center justify-center rounded-2xl border border-border/30 bg-card p-4 hover:bg-accent/40 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/[0.02] peer-data-[state=checked]:text-primary cursor-pointer transition-all duration-300 h-full text-center"
            >
              <Building className="h-5 w-5 mb-2 shrink-0" />
              <span className="text-xs font-bold leading-tight">Bank Transfer</span>
            </Label>
          </div>

          <div>
            <RadioGroupItem 
              value="wallet" 
              id="wallet" 
              className="peer sr-only" 
              disabled={!isVerified} 
            />
            <Label 
              htmlFor="wallet" 
              className={`flex flex-col items-center justify-center rounded-2xl border border-border/30 bg-card p-4 hover:bg-accent/40 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/[0.02] peer-data-[state=checked]:text-primary cursor-pointer transition-all duration-300 h-full text-center ${
                !isVerified ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Wallet className="h-5 w-5 mb-1 shrink-0" />
              <span className="text-xs font-bold leading-tight">String Wallet</span>
              <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                ₦{Number(profile?.wallet_balance || 0).toLocaleString()}
              </span>
            </Label>
          </div>
        </RadioGroup>
        
        {!isVerified && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 font-medium leading-normal animate-pulse-subtle">
             Verify your identity (NIN/BVN) in your profile page to activate and checkout using your String Wallet balance.
          </p>
        )}

        {paymentMethod === "wallet" && Number(profile?.wallet_balance || 0) < total && (
          <p className="text-[10px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 font-medium leading-normal">
             Insufficient Wallet Balance. Please choose another payment method or fund your wallet.
          </p>
        )}
      </div>
    </div>
  );
}
