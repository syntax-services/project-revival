import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { StructuredLocationSelection } from "@/hooks/useStructuredLocations";

interface CartBusinessData {
  business?: {
    company_name?: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    products?: { name?: string; price?: number };
    services?: { name?: string; price_min?: number };
  }>;
}

interface CheckoutOrderSummaryProps {
  businessesToCheckout: Record<string, CartBusinessData>;
  deliveryType: "standard" | "pickup";
  computedDeliveryFees: Record<string, number>;
  computedDeliveryDistances: Record<string, number>;
  deliveryLocation: StructuredLocationSelection | null;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  hasIdicDiscount: boolean;
  processing: boolean;
  paymentMethod: "card" | "wallet" | "bank_transfer";
  walletBalance: number;
  onPay: () => void;
}

export function CheckoutOrderSummary({
  businessesToCheckout,
  deliveryType,
  computedDeliveryFees,
  computedDeliveryDistances,
  deliveryLocation,
  subtotal,
  deliveryFee,
  discountAmount,
  total,
  hasIdicDiscount,
  processing,
  paymentMethod,
  walletBalance,
  onPay,
}: CheckoutOrderSummaryProps) {
  return (
    <div className="bg-card/45 backdrop-blur-md border border-border/20 rounded-[28px] p-6 shadow-sm sticky top-24 space-y-6 text-left">
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
        onClick={onPay}
        disabled={processing || (paymentMethod === "wallet" && walletBalance < total)}
      >
        {processing ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
        ) : (
          <><ShieldCheck className="mr-2 h-5 w-5" /> Pay ₦{total.toLocaleString()}</>
        )}
      </Button>
      
      {hasIdicDiscount && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl p-2.5 text-center text-xs font-bold animate-pulse">
           IDIC Competitor Promo Applied! (10% Off)
        </div>
      )}

      <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1 opacity-70">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" /> 100% Secure Transaction via Squad
      </p>
    </div>
  );
}
