import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Truck, Store, ShieldCheck, CreditCard, Wallet, Building, Copy, Landmark, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StructuredLocationPicker } from "@/components/location/StructuredLocationPicker";
import { StructuredLocationSelection, formatStructuredLocation, getLocationCoords } from "@/hooks/useStructuredLocations";
import { estimateDeliveryFee } from "@/lib/structuredDelivery";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionErrors";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get("business");
  const { user, profile } = useAuth();
  const { cartByBusiness, isLoading } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [deliveryType, setDeliveryType] = useState<"standard" | "pickup">("standard");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [processing, setProcessing] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<StructuredLocationSelection | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "bank_transfer">("card");
  const [virtualAccount, setVirtualAccount] = useState<{
    accountNumber: string;
    bankName: string;
    accountName: string;
    expectedAmount: number;
    reference: string;
  } | null>(null);
  const [transferTimer, setTransferTimer] = useState(1800); // 30 minutes in seconds

  useEffect(() => {
    if (!virtualAccount) return;
    const interval = setInterval(() => {
      setTransferTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [virtualAccount]);

  // Determine what businesses we are checkouting from
  const businessesToCheckout = useMemo(() => {
    if (businessId && cartByBusiness[businessId]) {
      return { [businessId]: cartByBusiness[businessId] };
    }
    return cartByBusiness;
  }, [businessId, cartByBusiness]);

  const hasItems = Object.keys(businessesToCheckout).length > 0;

  // Query location data for the checkouting businesses
  const { data: checkoutBusinesses } = useQuery({
    queryKey: ["checkout-businesses", Object.keys(businessesToCheckout)],
    queryFn: async () => {
      const bizIds = Object.keys(businessesToCheckout);
      if (bizIds.length === 0) return [];
      const { data, error } = await supabase
        .from("businesses")
        .select("id, company_name, business_location, latitude, longitude, location_verified")
        .in("id", bizIds);
      if (error) throw error;
      return data || [];
    },
    enabled: hasItems
  });

  const [completedOrdersCount, setCompletedOrdersCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchCompletedOrders = async () => {
      try {
        const { data: customerData } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (customerData) {
          const { count, error } = await supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("customer_id", customerData.id)
            .eq("status", "completed");

          if (!error && count !== null) {
            setCompletedOrdersCount(count);
          }
        }
      } catch (err) {
        console.error("Error fetching completed orders count:", err);
      }
    };

    fetchCompletedOrders();
  }, [user]);

  const hasIdicDiscount =
    !!((profile?.user_type === "admin" || profile?.idic_code) &&
    completedOrdersCount !== null &&
    completedOrdersCount < 5);

  const subtotal = useMemo(() => {
    return Object.values(businessesToCheckout).reduce((sum, data) => sum + data.total, 0);
  }, [businessesToCheckout]);

  const discountAmount = hasIdicDiscount ? Math.round(subtotal * 0.1) : 0;

  // Calculate delivery fee for each store to the selected coordinates.
  const computedDeliveryFees = useMemo(() => {
    const fees: Record<string, number> = {};
    if (deliveryType !== "standard" || !checkoutBusinesses || !deliveryLocation) return fees;

    const target = getLocationCoords(deliveryLocation);

    checkoutBusinesses.forEach(biz => {
      const estimate = estimateDeliveryFee(
        { latitude: Number(biz.latitude), longitude: Number(biz.longitude) },
        { latitude: target.latitude, longitude: target.longitude },
      );

      fees[biz.id] = estimate?.fee ?? 1000;
    });
    return fees;
  }, [deliveryType, checkoutBusinesses, deliveryLocation]);

  const computedDeliveryDistances = useMemo(() => {
    const distances: Record<string, number> = {};
    if (deliveryType !== "standard" || !checkoutBusinesses || !deliveryLocation) return distances;

    const target = getLocationCoords(deliveryLocation);

    checkoutBusinesses.forEach((biz) => {
      const estimate = estimateDeliveryFee(
        { latitude: Number(biz.latitude), longitude: Number(biz.longitude) },
        { latitude: target.latitude, longitude: target.longitude },
      );

      distances[biz.id] = estimate?.estimatedRoadDistanceKm ?? 0;
    });

    return distances;
  }, [deliveryType, checkoutBusinesses, deliveryLocation]);

  const deliveryFee = useMemo(() => {
    if (deliveryType !== "standard") return 0;
    const feesArray = Object.values(computedDeliveryFees);
    if (feesArray.length === 0) return 0;
    
    // Multi-store discount: Max fee + 150 surcharge per additional store
    const maxBaseFee = Math.max(...feesArray);
    const additionalStopsSurcharge = (feesArray.length - 1) * 150;
    return maxBaseFee + additionalStopsSurcharge;
  }, [deliveryType, computedDeliveryFees]);

  const total = subtotal + deliveryFee - discountAmount;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasItems) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-20 text-center space-y-4">
          <h2 className="text-xl font-semibold">Your cart is empty</h2>
          <Button onClick={() => navigate("/customer/discover")}>Go back to shopping</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handlePayment = async () => {
    if (deliveryType === "standard" && (!profile?.verification_level || profile.verification_level < 2)) {
      toast({
        variant: "destructive",
        title: "Identity Verification Required",
        description: "Please verify your NIN or BVN in your profile before requesting delivery.",
      });
      navigate("/customer/profile");
      return;
    }

    if (deliveryType === "standard" && !deliveryLocation) {
      toast({ variant: "destructive", title: "Choose your delivery landmark" });
      return;
    }

    if (!user?.email) {
      toast({ variant: "destructive", title: "User email not found" });
      return;
    }

    setProcessing(true);
    try {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!customer) throw new Error("Customer profile not found");

      const orderIds: string[] = [];
      const structuredAddress = deliveryLocation ? formatStructuredLocation(deliveryLocation) : "";
      const fullDeliveryAddress = [structuredAddress, address.trim()].filter(Boolean).join(" - ");

      if (deliveryType === "standard" && deliveryLocation) {
        const coords = getLocationCoords(deliveryLocation);
        const dbLandmarkId = deliveryLocation.landmark?.id && !deliveryLocation.landmark.id.startsWith("default-")
          ? deliveryLocation.landmark.id
          : null;

        await supabase
          .from("customers")
          .update({
            location_area_id: deliveryLocation.area.id,
            location_street_id: deliveryLocation.street.id,
            location_landmark_id: dbLandmarkId,
            location: deliveryLocation.area.name,
            area_name: deliveryLocation.area.name,
            street_address: fullDeliveryAddress,
            latitude: coords.latitude,
            longitude: coords.longitude,
          })
          .eq("id", customer.id);
      }

      // Create a pending order record for each business
      for (const [bizId, data] of Object.entries(businessesToCheckout)) {
        const items = data.items.map(item => ({
          product_id: item.product_id || item.service_id || "unknown",
          productId: item.product_id || item.service_id || "unknown",
          name: item.products?.name || item.services?.name || "Item",
          price: Number(item.products?.price) || Number(item.services?.price_min) || 0,
          quantity: item.quantity,
          total: (Number(item.products?.price) || Number(item.services?.price_min) || 0) * item.quantity
        }));

        const bizSubtotal = data.total;
        const bizDeliveryFee = deliveryType === "standard" ? (computedDeliveryFees[bizId] ?? Math.round(deliveryFee / Object.keys(businessesToCheckout).length)) : 0;
        const bizDiscount = hasIdicDiscount ? Math.round(bizSubtotal * 0.1) : 0;
        const bizTotal = bizSubtotal + bizDeliveryFee - bizDiscount;
        const commissionAmount = Math.round(bizSubtotal * 0.06); // 6% flat commission

        const orderPayload = {
          business_id: bizId,
          customer_id: customer.id,
          status: "pending",
          items: items,
          subtotal: bizSubtotal,
          delivery_fee: bizDeliveryFee,
          platform_fee: 0,
          commission_amount: commissionAmount,
          total: bizTotal,
          delivery_address: deliveryType === "pickup" ? null : fullDeliveryAddress || null,
          delivery_notes: deliveryType === "standard" && instructions.trim() ? `Instructions: ${instructions.trim()}` : null,
          delivery_landmark_id: deliveryType === "standard" && deliveryLocation?.landmark?.id && !deliveryLocation.landmark.id.startsWith("default-")
            ? deliveryLocation.landmark.id
            : null,
          delivery_distance_km: deliveryType === "standard" ? computedDeliveryDistances[bizId] ?? null : null,
          delivery_pricing: deliveryType === "standard" ? {
            area: deliveryLocation?.area.name,
            street: deliveryLocation?.street.name,
            landmark: deliveryLocation?.landmark?.name || "General / Other",
            rate_per_km: 250,
            curvature_multiplier: 1.3,
          } : {},
        };

        const { data: newOrder, error: orderErr } = await supabase
          .from("orders")
          .insert(orderPayload)
          .select("id")
          .single();

        if (orderErr || !newOrder) {
          throw new Error(orderErr?.message || "Failed to create order for " + (data.business?.company_name || "store"));
        }
        orderIds.push(newOrder.id);
      }

      if (paymentMethod === "wallet") {
        // Execute Wallet Checkout RPC
        const { data: walletData, error: walletErr } = await supabase.rpc("pay_with_wallet", {
          p_order_ids: orderIds
        });

        if (walletErr) throw walletErr;
        const result = walletData as any;
        if (!result || !result.success) {
          throw new Error(result?.error || "Failed to complete wallet payment transaction");
        }

        // Clear customer cart
        await supabase.from("cart_items").delete().eq("customer_id", customer.id);

        toast({
          title: "Order Placed Successfully! 🎉",
          description: "Paid instantly using your String Wallet balance.",
        });
        navigate("/customer/profile");
        return;
      }

      // Initialize Squad payment (Card or Dynamic Bank Transfer)
      const payload = {
        email: user.email,
        amount: total,
        orderId: orderIds.join(","),
        paymentMethod: paymentMethod, // 'card' or 'bank_transfer'
        metadata: {
          order_id: orderIds.join(","),
          multiple_stores: true
        }
      };

      const { data: payData, error: payErr } = await supabase.functions.invoke("initialize-payment", {
        body: payload
      });

      if (payErr) {
        throw new Error(await getEdgeFunctionErrorMessage(payErr, "Failed to initialize checkout"));
      }
      
      if (paymentMethod === "bank_transfer") {
        if (!payData?.success || !payData?.virtual_account_number) {
          throw new Error(payData?.error || "Failed to generate dynamic virtual account");
        }

        // Clear customer cart
        await supabase.from("cart_items").delete().eq("customer_id", customer.id);

        setVirtualAccount({
          accountNumber: payData.virtual_account_number,
          bankName: payData.bank_name || "GTBank",
          accountName: payData.account_name || "String Marketplace Payment",
          expectedAmount: payData.amount || total,
          reference: payData.reference
        });
        setTransferTimer(1800); // 30 minutes countdown
        toast({
          title: "Virtual Account Generated",
          description: "Please transfer the exact total to complete your checkout.",
        });
        setProcessing(false);
      } else {
        if (!payData?.success || !payData?.authorization_url) {
          throw new Error(payData?.error || "Failed to initialize payment gateway transaction");
        }

        // Clear customer cart
        await supabase.from("cart_items").delete().eq("customer_id", customer.id);
        window.location.href = payData.authorization_url;
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({ variant: "destructive", title: "Checkout Error", description: err.message || "Failed to initialize checkout" });
      setProcessing(false);
    }
  };

  if (virtualAccount) {
    const minutes = Math.floor(transferTimer / 60);
    const seconds = transferTimer % 60;
    const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    const handleCopy = () => {
      navigator.clipboard.writeText(virtualAccount.accountNumber);
      toast({
        title: "Copied!",
        description: "Account number copied to clipboard.",
      });
    };

    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto p-6 md:p-10 animate-fade-in pb-24 space-y-6">
          <div className="bg-card border border-border/20 rounded-[28px] p-8 shadow-premium text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse">
                <Landmark className="h-8 w-8" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-foreground">Direct Bank Transfer</h1>
              <p className="text-sm text-muted-foreground">
                Please transfer the exact amount below to the dynamic virtual account. The system will auto-detect your transfer.
              </p>
            </div>

            <div className="p-6 bg-muted/30 rounded-2xl space-y-4 text-left border border-border/10">
              <div className="flex justify-between items-center pb-3 border-b border-border/10">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Expected Amount</span>
                <span className="text-lg font-black text-primary">₦{virtualAccount.expectedAmount.toLocaleString()}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Bank Name</span>
                <p className="text-sm font-bold text-foreground">{virtualAccount.bankName}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Account Name</span>
                <p className="text-sm font-bold text-foreground">{virtualAccount.accountName}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Account Number</span>
                <div className="flex items-center justify-between bg-background border border-border/30 rounded-xl px-3 h-11">
                  <span className="font-mono font-bold text-base tracking-widest text-foreground">{virtualAccount.accountNumber}</span>
                  <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 rounded-lg">
                    <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                ⏰ Dynamic Account expires in: {formattedTime}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Do not transfer funds after the timer expires. We are waiting for Squad settlement updates.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button 
                onClick={() => navigate("/customer/profile")} 
                className="w-full h-11 rounded-full font-bold shadow-md"
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Go to My Orders
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setVirtualAccount(null)} 
                className="w-full h-11 rounded-full text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel / Choose Another Method
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 md:p-10 animate-fade-in pb-24 space-y-6">
        <Button 
          variant="ghost" 
          className="mb-2 -ml-4 rounded-full text-muted-foreground hover:text-foreground" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cart
        </Button>

        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Secure Checkout</h1>
          <p className="text-sm text-muted-foreground">Complete your order securely with Squad</p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 pt-4">
          {/* Left Column: Delivery Details */}
          <div className="space-y-8">
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
                {(!profile?.verification_level || profile.verification_level < 2) && (
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
                    disabled={!profile?.verification_level || profile.verification_level < 2} 
                  />
                  <Label 
                    htmlFor="wallet" 
                    className={`flex flex-col items-center justify-center rounded-2xl border border-border/30 bg-card p-4 hover:bg-accent/40 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/[0.02] peer-data-[state=checked]:text-primary cursor-pointer transition-all duration-300 h-full text-center ${
                      (!profile?.verification_level || profile.verification_level < 2) ? "opacity-50 cursor-not-allowed" : ""
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
              
              {(!profile?.verification_level || profile.verification_level < 2) && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 font-medium leading-normal animate-pulse-subtle">
                  ⚠️ Verify your identity (NIN/BVN) in your profile page to activate and checkout using your String Wallet balance.
                </p>
              )}

              {paymentMethod === "wallet" && Number(profile?.wallet_balance || 0) < total && (
                <p className="text-[10px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 font-medium leading-normal">
                  ❌ Insufficient Wallet Balance. Please choose another payment method or fund your wallet.
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="bg-card/45 backdrop-blur-md border border-border/20 rounded-[28px] p-6 shadow-sm sticky top-24 space-y-6">
              <h2 className="text-lg font-bold tracking-tight text-foreground">Order Summary</h2>
              
              <div className="space-y-6 max-h-[280px] overflow-y-auto pr-1">
                {Object.entries(businessesToCheckout).map(([bizId, data]) => (
                  <div key={bizId} className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{data.business?.company_name || "Store"}</p>
                    <div className="space-y-2 pl-2 border-l border-border/40">
                      {data.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2 flex-1 overflow-hidden">
                            <div className="font-bold text-muted-foreground bg-muted/50 w-5 h-5 flex items-center justify-center rounded-lg text-[9px] shrink-0">
                              {item.quantity}x
                            </div>
                            <span className="truncate text-foreground/80 font-medium">
                              {item.products?.name || item.services?.name || "Item"}
                            </span>
                          </div>
                          <span className="font-bold text-foreground ml-4">
                            ₦{((Number(item.products?.price) || Number(item.services?.price_min) || 0) * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {deliveryType === "standard" && (
                        <div className="flex justify-between text-[10px] text-muted-foreground pl-7">
                          <span>
                            Delivery{computedDeliveryDistances[bizId] ? ` (${computedDeliveryDistances[bizId].toFixed(1)} km)` : ""}:
                          </span>
                          <span className="font-bold text-foreground/70">₦{(computedDeliveryFees[bizId] ?? 1000).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-px bg-border/20" />

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground/85">₦{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Delivery Fee</span>
                  <span className="font-semibold text-foreground/85">₦{deliveryFee.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>IDIC 10% Discount</span>
                    <span>-₦{discountAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-border/20" />

              <div className="flex justify-between items-center font-extrabold text-lg">
                <span>Total</span>
                <span className="text-primary text-xl">₦{total.toLocaleString()}</span>
              </div>

              {deliveryType === "standard" && deliveryLocation && (
                <div className="rounded-xl border border-primary/10 bg-primary/[0.03] p-3 text-[11px] text-muted-foreground">
                  <p className="font-bold text-foreground">Deliver to {deliveryLocation.landmark?.name || "General / Other"}</p>
                  <p>{deliveryLocation.street.name}, {deliveryLocation.area.name}</p>
                </div>
              )}

              <Button 
                className="w-full h-12 text-base rounded-full shadow-premium hover:shadow-premium-lg transition-all duration-300" 
                onClick={handlePayment}
                disabled={processing || (paymentMethod === "wallet" && Number(profile?.wallet_balance || 0) < total)}
              >
                {processing ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><ShieldCheck className="mr-2 h-5 w-5" /> Pay ₦{total.toLocaleString()}</>
                )}
              </Button>
              
              {hasIdicDiscount && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl p-2.5 text-center text-xs font-bold animate-pulse">
                  🎉 IDIC Competitor Promo Applied! (10% Off)
                </div>
              )}

              <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1 opacity-70">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> 100% Secure Transaction via Squad
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
