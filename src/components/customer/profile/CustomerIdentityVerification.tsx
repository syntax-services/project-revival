import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CustomerIdentityVerificationProps {
  profile: {
    user_id?: string;
    verification_level?: number | null;
  } | null;
  refreshProfile: () => Promise<void>;
}

export function CustomerIdentityVerification({ profile, refreshProfile }: CustomerIdentityVerificationProps) {
  const [verifyingIdentity, setVerifyingIdentity] = useState(false);

  const handleVerifyIdentity = async () => {
    try {
      setVerifyingIdentity(true);
      const { data, error } = await supabase.functions.invoke("didit-auth", {
        body: { action: "create_session" }
      });
      if (error) throw error;

      if (data?.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        toast.info("Didit verification initialized. Complete the prompt on screen.");
        await refreshProfile();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification error";
      toast.error(message || "Failed to initialize Didit verification.");
    } finally {
      setVerifyingIdentity(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/40 overflow-hidden shadow-md">
      <div className="p-4 border-b border-border/10 flex items-center gap-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-inner">
          <ShieldCheck className="h-4.5 w-4.5 text-primary drop-shadow-sm" />
        </div>
        <div>
          <h2 className="font-bold text-sm text-foreground tracking-tight">Identity Verification</h2>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Level 2 Protection</p>
        </div>
      </div>
      <div className="p-4 space-y-4 text-left">
        {profile?.verification_level && profile.verification_level >= 2 ? (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-6 w-6 shrink-0 text-emerald-500" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Account Verified</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Your identity has been cryptographically secured via Didit. You have full withdrawal privileges.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-tight">
              Verify your identity using Didit (NIN / Passport) to enable payout withdrawals and unlock full shopper benefits.
            </p>
            <Button
              onClick={handleVerifyIdentity}
              disabled={verifyingIdentity}
              className="w-full h-10 text-xs font-bold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-md transition-all duration-300 flex items-center justify-center gap-2"
            >
              {verifyingIdentity ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initializing...</>
              ) : (
                <>Verify Identity with Didit </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
