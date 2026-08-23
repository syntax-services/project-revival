import React, { useEffect, useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { CheckCircle2, XCircle, Loader2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PaymentKind = "order" | "funding" | "job";

export default function PaymentCallback() {
  usePageMeta({
    title: "Payment Verification",
    description: "Verifying your transaction status and escrow funding.",
    noindex: true,
    });

  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");
  const navigate = useNavigate();
  const { clearCart } = useCart();
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [paymentKind, setPaymentKind] = useState<PaymentKind>("order");
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      return;
    }

    const checkStatus = async () => {
      try {
        // The webhook handles actual verification, but we can optimistically show success
        // or poll the payment_transactions table
        const { data, error } = await supabase
          .from("payment_transactions")
          .select("status, amount, order_id, metadata")
          .eq("paystack_reference", reference)
          .single();

        if (error) throw error;

        const metadata = data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
          ? data.metadata as Record<string, unknown>
          : {};
        const nextKind: PaymentKind =
          metadata.type === "funding" ? "funding" :
          metadata.job_id ? "job" :
          "order";

        setPaymentKind(nextKind);
        setAmount(Number(data.amount || 0));
        
        if (["success", "completed", "pending"].includes(data.status)) {
          if (nextKind === "order" || nextKind === "job") {
            clearCart.mutate();
          }
          // Even if pending, we consider it a success flow on the frontend until webhook confirms
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (err) {
        console.error("Error verifying payment callback:", err);
        setStatus("error");
      }
    };

    checkStatus();
  }, [reference, clearCart]);

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <h2 className="text-xl font-semibold">Verifying your payment...</h2>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-6 animate-in zoom-in-50 duration-500">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              {paymentKind === "funding" ? (
                <Wallet className="h-12 w-12 text-green-600 dark:text-green-400" />
              ) : (
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">
                {paymentKind === "funding" ? "Wallet Funded!" : "Payment Successful!"}
              </h2>
              <p className="text-muted-foreground text-lg max-w-md">
                {paymentKind === "funding"
                  ? `Your String wallet deposit${amount ? ` of ₦${amount.toLocaleString()}` : ""} is being confirmed. Your balance will update once Squad settlement arrives.`
                  : paymentKind === "job"
                    ? "Your job payment has been received and the provider has been notified."
                    : "Your order has been placed and the business has been notified."}
              </p>
            </div>
            <div className="flex gap-4 mt-4">
              {paymentKind === "funding" ? (
                <>
                  <Button onClick={() => navigate("/customer/profile")}>
                    View Wallet
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/customer")}>
                    Go Home
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => navigate(paymentKind === "job" ? "/customer/jobs" : "/customer/orders")}>
                    {paymentKind === "job" ? "View Job" : "Track Order"}
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/customer/discover")}>
                    Continue Shopping
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-6 animate-in zoom-in-50 duration-500">
            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Payment Failed</h2>
              <p className="text-muted-foreground text-lg max-w-md">
                Something went wrong with your payment. Please try again or contact support.
              </p>
            </div>
            <div className="flex gap-4 mt-4">
              <Button onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
