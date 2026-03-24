import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TermsGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const publicRoutes = ["/", "/auth", "/privacy", "/terms", "/contact"];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const shouldCheckTerms = !!user && !!profile?.onboarding_completed && !isPublicRoute;

  // Fetch the latest terms version from system_config
  const { data: config } = useQuery({
    queryKey: ["latest-terms-version"],
    enabled: shouldCheckTerms,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "latest_terms_version")
        .single();
      if (error) return { value: 1 };
      return data;
    },
  });

  useEffect(() => {
    if (!shouldCheckTerms) {
      setShowModal(false);
      return;
    }

    if (config?.value) {
      const rawValue = config.value;
      const version: number = typeof rawValue === 'string' ? parseInt(rawValue, 10) : Number(rawValue);
      if (Number.isNaN(version)) return;
      setLatestVersion(version);
      
      // If user is logged in and hasn't accepted the latest version
      if (user && profile && profile.onboarding_completed) {
        if (!profile.accepted_terms_version || profile.accepted_terms_version < version) {
          setShowModal(true);
        }
      }
    }
  }, [config, profile, shouldCheckTerms, user]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !latestVersion) return;
      
      const { error } = await supabase
        .from("profiles")
        .update({
          accepted_terms_version: latestVersion,
          terms_accepted_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Terms accepted. Welcome back!");
      setShowModal(false);
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to accept terms");
    },
  });

  return (
    <>
      {children}
      
      <Dialog open={showModal} onOpenChange={() => {}}>
        <DialogContent className="max-h-[100dvh] gap-0 overflow-hidden border-0 bg-background p-0 shadow-2xl sm:max-w-2xl sm:rounded-3xl">
          <div className="flex max-h-[100dvh] flex-col overflow-hidden">
            <DialogHeader className="border-b border-border/40 px-4 py-5 sm:px-6 sm:py-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-w-0 space-y-2 text-left">
                  <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">Terms of Service Update</DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
                    We updated our Terms of Service (Version {latestVersion}) so the rules are clearer around payments,
                    platform safety, escrow-style transaction handling, and account enforcement.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[58vh] px-4 py-4 sm:max-h-[50vh] sm:px-6">
              <div className="space-y-5 text-sm leading-7 text-muted-foreground">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">1. Platform role</h3>
                  <p>
                    String does more than introduce buyers and sellers. We support discovery, communication, payment flow,
                    and transaction coordination across the platform.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">2. Transactions and escrow support</h3>
                  <p>
                    For eligible transactions, String acts as the marketplace intermediary and may hold or control payment flow
                    through platform partners until release conditions, review steps, or delivery milestones are satisfied.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">3. Account responsibility</h3>
                  <p>
                    You remain responsible for your account activity, profile accuracy, order behavior, and any actions taken
                    through your login or business presence on String.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">4. Safety and enforcement</h3>
                  <p>
                    We may immediately restrict, suspend, close, or terminate accounts, listings, payouts, or transactions if
                    we detect suspicious conduct, fraud risk, payment abuse, policy violations, impersonation, or any activity
                    that may harm users or the platform.
                  </p>
                </div>

                <p className="border-t border-border/40 pt-4 italic">
                  This is a summary. Please read the full{" "}
                  <a href="/terms" target="_blank" className="font-medium text-primary hover:underline" rel="noreferrer">
                    Terms of Service here
                  </a>
                  .
                </p>
              </div>
            </ScrollArea>

            <DialogFooter className="gap-3 border-t border-border/40 px-4 py-4 sm:flex-row sm:px-6">
            <Button 
              variant="outline" 
              className="h-11 border-0 bg-muted px-6 font-semibold hover:bg-muted/80"
              onClick={() => {
                supabase.auth.signOut();
                setShowModal(false);
              }}
            >
              Sign Out
            </Button>
            <Button 
              className="h-11 bg-primary px-6 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              I Accept & Continue
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
