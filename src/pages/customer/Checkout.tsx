import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StructuredLocationSelection, formatStructuredLocation, getLocationCoords } from "@/hooks/useStructuredLocations";
import { estimateDeliveryFee } from "@/lib/structuredDelivery";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionErrors";

// Modular checkout components
import { CheckoutBankTransferModal } from "@/components/checkout/CheckoutBankTransferModal";
import { CheckoutDeliveryMatrix } from "@/components/checkout/CheckoutDeliveryMatrix";
import { CheckoutOrderSummary } from "@/components/checkout/CheckoutOrderSummary";

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
  const [transferTimer, setTransferTimer] = useState(1800);

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

  const businessesToCheckout = useMemo(() => {
    if (businessId && cartByBusiness[businessId]) {
      return { [businessId]: cartByBusiness[businessId] };
    }
    return cartByBusiness;
  }, [businessId, cartByBusiness]);

  const hasItems = Object.keys(businessesToCheckout).length > 0;

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

      for (const [bizId, data] of Object.entries(businessesToCheckout)) {
        const orderItemsPayload = data.items.map((item) => ({
          product_id: item.product_id || null,
          service_id: item.service_id || null,
          name: item.products?.name || item.services?.name || "Item",
          quantity: item.quantity,
          price: Number(item.products?.price) || Number(item.services?.price_min) || 0,
        }));

        const bizDeliveryFee = deliveryType === "standard" ? (computedDeliveryFees[bizId] ?? 0) : 0;
        const bizSubtotal = data.total;
        const bizTotal = bizSubtotal + bizDeliveryFee;

        const orderPayload: any = {
          customer_id: customer.id,
          business_id: bizId,
          total_price: bizTotal,
          delivery_fee: bizDeliveryFee,
          status: "pending",
          items: orderItemsPayload,
          delivery_type: deliveryType,
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
        const { data: walletData, error: walletErr } = await supabase.rpc("pay_with_wallet", {
          p_order_ids: orderIds
        });

        if (walletErr) throw walletErr;
        const result = walletData as any;
        if (!result || !result.success) {
          throw new Error(result?.error || "Failed to complete wallet payment transaction");
        }

        await supabase.from("cart_items").delete().eq("customer_id", customer.id);

        toast({
          title: "Order Placed Successfully! ",
          description: "Paid instantly using your String Wallet balance.",
        });
        navigate("/customer/profile");
        return;
      }

      const payload = {
        email: user.email,
        amount: total,
        orderId: orderIds.join(","),
        paymentMethod: paymentMethod,
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

        await supabase.from("cart_items").delete().eq("customer_id", customer.id);

        setVirtualAccount({
          accountNumber: payData.virtual_account_number,
          bankName: payData.bank_name || "GTBank",
          accountName: payData.account_name || "String Marketplace Payment",
          expectedAmount: payData.amount || total,
          reference: payData.reference
        });
        setTransferTimer(1800);
        toast({
          title: "Virtual Account Generated",
          description: "Please transfer the exact total to complete your checkout.",
        });
        setProcessing(false);
      } else {
        if (!payData?.success || !payData?.authorization_url) {
          throw new Error(payData?.error || "Failed to initialize payment gateway transaction");
        }

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
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto p-6 md:p-10 animate-fade-in pb-24 space-y-6">
          <CheckoutBankTransferModal
            virtualAccount={virtualAccount}
            transferTimer={transferTimer}
            processing={processing}
            onVerifyPayment={() => navigate("/customer/profile")}
          />
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

        <div className="space-y-1 text-left">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Secure Checkout</h1>
          <p className="text-sm text-muted-foreground">Complete your order securely with Squad</p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 pt-4">
          <CheckoutDeliveryMatrix
            deliveryType={deliveryType}
            setDeliveryType={setDeliveryType}
            deliveryLocation={deliveryLocation}
            setDeliveryLocation={setDeliveryLocation}
            address={address}
            setAddress={setAddress}
            instructions={instructions}
            setInstructions={setInstructions}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            profile={profile}
            total={total}
          />

          <CheckoutOrderSummary
            businessesToCheckout={businessesToCheckout}
            deliveryType={deliveryType}
            computedDeliveryFees={computedDeliveryFees}
            computedDeliveryDistances={computedDeliveryDistances}
            deliveryLocation={deliveryLocation}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            discountAmount={discountAmount}
            total={total}
            hasIdicDiscount={hasIdicDiscount}
            processing={processing}
            paymentMethod={paymentMethod}
            walletBalance={Number(profile?.wallet_balance || 0)}
            onPay={handlePayment}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
