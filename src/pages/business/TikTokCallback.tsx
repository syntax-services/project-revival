import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { TikTokIcon } from "@/components/atoms/TikTokIcon";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TikTokCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: business, isLoading: isBusinessLoading } = useBusiness();
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (exchangeAttempted.current) return;

    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");

    if (errorParam) {
      console.warn("TikTok OAuth returned error param:", errorParam, errorDesc);
      toast.error(
        errorParam === "access_denied"
          ? "TikTok authorization was cancelled."
          : "TikTok connection could not be established."
      );
      navigate("/business/growth", { replace: true });
      return;
    }

    if (!code) {
      // If no code and not in error, invalid callback
      setErrorMessage("No authorization code received from TikTok.");
      setIsProcessing(false);
      return;
    }

    // Wait for business profile if still loading
    if (isBusinessLoading) {
      return;
    }

    const businessId = stateParam || business?.id;
    if (!businessId) {
      if (!user) {
        toast.error("Please sign in to complete your TikTok connection.");
        navigate("/auth", { replace: true });
        return;
      }
      setErrorMessage("Could not identify your active business store. Please return to your dashboard.");
      setIsProcessing(false);
      return;
    }

    exchangeAttempted.current = true;

    async function performExchange() {
      try {
        const currentRedirectUri = typeof window !== "undefined" ? `${window.location.origin}/callback` : "https://www.string.com.ng/callback";
        const targetRedirectUri = currentRedirectUri.includes("localhost")
          ? currentRedirectUri
          : "https://www.string.com.ng/callback";

        const { data, error } = await supabase.functions.invoke("tiktok-oauth-exchange", {
          body: {
            code,
            business_id: businessId,
            redirect_uri: targetRedirectUri,
          },
        });

        if (error) {
          console.error("TikTok OAuth exchange function error:", error);
          throw new Error(
            error instanceof Error
              ? error.message
              : typeof error === "object" && error !== null && "message" in error
                ? String((error as { message: unknown }).message)
                : "Could not link TikTok account"
          );
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        toast.success("TikTok Connected! Your products will now be boosted automatically.");
        navigate("/business/growth", { replace: true });
      } catch (err: unknown) {
        console.error("TikTok callback exchange failed:", err);
        const errMsg = err instanceof Error ? err.message : String(err);
        const userFriendly =
          errMsg.includes("re-authorize") || errMsg.includes("invalid")
            ? "TikTok authorization session expired or was revoked. Please try connecting again."
            : "We couldn't connect your TikTok account. Please check your permissions and try again.";

        setErrorMessage(userFriendly);
        setIsProcessing(false);
        toast.error(userFriendly);
      }
    }

    performExchange();
  }, [searchParams, business?.id, isBusinessLoading, user, navigate]);

  return (
    <div className="min-h-screen bg-[#000000] text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#ff0050]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Liquid Glass Central Card */}
      <div className="w-full max-w-md bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center text-center">
        {/* Animated Brand Pulse */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-black border border-white/15 flex items-center justify-center shadow-lg relative z-10">
            <TikTokIcon className="w-10 h-10 text-white" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-cyan-400/20 blur-xl animate-pulse" />
          <div className="absolute -inset-1 rounded-2xl bg-[#ff0050]/20 blur-lg animate-pulse delay-150" />
        </div>

        {isProcessing ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-white mb-2">
              Authorizing TikTok Social Commerce Hub...
            </h1>
            <p className="text-sm text-neutral-400 max-w-xs mb-6">
              Establishing a secure connection and enabling automated product boost with String.
            </p>
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Verifying merchant OAuth tokens...</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white mb-2">
              Connection Incomplete
            </h1>
            <p className="text-sm text-neutral-400 mb-6 max-w-xs">
              {errorMessage || "We were unable to verify your TikTok merchant connection."}
            </p>
            <Button
              onClick={() => navigate("/business/growth", { replace: true })}
              className="w-full h-11 bg-white text-black hover:bg-neutral-200 rounded-xl font-medium active:scale-95 transition-all"
            >
              Return to Strategy & Growth
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
