import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function PaymentCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "success" | "error" | "timeout">("loading");
    const isMountedRef = useRef(true);

    const reference = searchParams.get("reference") ?? searchParams.get("trxref");

    const checkPayment = useCallback(async (isManual = false) => {
        if (!reference) {
            setStatus("error");
            return;
        }

        if (isManual) setStatus("loading");

        // Polling loop logic
        let attempts = 0;
        const maxAttempts = 20; // Increased for better robustness
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        while (isMountedRef.current && attempts < maxAttempts) {
            attempts++;
            
            try {
                const { data: transaction, error } = await supabase
                    .from("payment_transactions")
                    .select("status")
                    .eq("paystack_reference", reference)
                    .maybeSingle();

                if (transaction?.status === "success") {
                    setStatus("success");
                    return;
                }

                if (transaction?.status === "failed") {
                    setStatus("error");
                    return;
                }
            } catch (err) {
                console.error("Polling error:", err);
            }

            // Wait for 3 seconds before next attempt
            await delay(3000);
        }

        if (isMountedRef.current && status === "loading") {
            setStatus("timeout");
        }
    }, [reference]);

    useEffect(() => {
        isMountedRef.current = true;
        checkPayment();
        
        return () => {
            isMountedRef.current = false;
        };
    }, [checkPayment]);

    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                {status === "loading" && (
                    <div className="space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                        <h1 className="text-2xl font-bold">Verifying Payment...</h1>
                        <p className="text-muted-foreground">Please wait while we confirm your transaction.</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold">Payment Successful!</h1>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Thank you for your order. Your payment has been confirmed and the business has been notified.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                            <Button onClick={() => navigate("/customer/orders")}>
                                View My Orders
                            </Button>
                            <Button variant="outline" onClick={() => navigate("/customer/discover")}>
                                Continue Shopping
                            </Button>
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="h-20 w-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold">Payment Failed</h1>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Something went wrong with your payment. Your card has not been charged, or a refund will be processed if applicable.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                            <Button onClick={() => navigate("/customer/discover")}>
                                Try Again
                            </Button>
                            <Button variant="outline" onClick={() => navigate("/customer/messages")}>
                                Contact Support
                            </Button>
                        </div>
                    </div>
                )}

                {status === "timeout" && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="h-20 w-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto">
                            <Clock className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold">Still Verifying...</h1>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Your payment is taking longer than expected to confirm. This does not mean it failed — our system is still processing.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                            <Button onClick={() => checkPayment(true)} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Check Again
                            </Button>
                            <Button variant="outline" onClick={() => navigate("/customer/orders")}>
                                View My Orders
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                            If the payment was debited, it will be confirmed automatically. Contact support if this persists.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
