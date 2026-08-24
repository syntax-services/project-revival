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
  const [safetyChecked, setSafetyChecked] = useState(false);
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
      if (error) return { value: 2 };
      return data;
    },
  });

  useEffect(() => {
    if (!shouldCheckTerms) {
      setShowModal(false);
      return;
    }

    if (config?.value !== undefined || config === null) {
      const rawValue = config?.value || 3;
      const version: number = typeof rawValue === 'string' ? parseInt(rawValue, 10) : Number(rawValue);
      const activeVersion = Number.isNaN(version) ? 3 : Math.max(version, 3);
      setLatestVersion(activeVersion);
      
      // If user is logged in and hasn't accepted the latest version
      if (user && profile && profile.onboarding_completed) {
        if (!profile.accepted_terms_version || profile.accepted_terms_version < activeVersion) {
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
        <DialogContent 
          className="max-h-[100dvh] gap-0 overflow-hidden border-0 bg-background p-0 shadow-2xl sm:max-w-2xl sm:rounded-3xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex max-h-[100dvh] flex-col overflow-hidden">
            <DialogHeader className="border-b border-border/40 px-4 py-5 sm:px-6 sm:py-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-w-0 space-y-2 text-left">
                  <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">Terms of Service Update</DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
                    We updated our Terms of Service & Privacy Policy (Version {latestVersion}) regarding campus discovery,
                    merchant verification (IDIC), transparent view tracking, and communication safety.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="max-h-[58vh] px-4 py-4 sm:max-h-[50vh] sm:px-6">
              <div className="space-y-5 text-sm leading-7 text-muted-foreground">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">1. Campus Discovery & Direct Communication</h3>
                  <p>
                    String connects verified students, creators, and local businesses with campus buyers. You agree to communicate respectfully, inspect goods during delivery, and adhere to community guidelines.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">2. Merchant Obligations & Authentic Metrics</h3>
                  <p>
                    Merchants agree to provide accurate descriptions of listings. String enforces transparent view analytics ("1 Account = 1 Viewer") to maintain authentic engagement and zero metric inflation.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">3. Privacy & Data Consent (NDPA / NDPR)</h3>
                  <p>
                    We collect profile, location coordinates, and interaction data strictly to calculate campus proximity and power search discovery. You retain full rights to export or permanently delete your account data.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">4. Safety, Prohibited Items & Enforcement</h3>
                  <p>
                    Counterfeit items, contraband, harassment, and fraudulent conduct are strictly prohibited. String reserves the right to immediately terminate accounts violating community integrity.
                  </p>
                </div>

                <div className="space-y-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                  <h3 className="text-base font-semibold text-red-500 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> 5. Mandatory Physical Safety
                  </h3>
                  <p className="text-red-500/90 text-sm">
                    String does not escort transactions. To avoid the risk of kidnapping, theft, or physical harm, you strictly agree to only exchange goods and cash in well-lit, highly populated public spaces (e.g., campus squares, busy cafeterias).
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

            <DialogFooter className="gap-3 border-t border-border/40 px-4 py-4 sm:flex-col sm:px-6">
              {/* Mandatory Checkbox */}
              <div className="flex items-start gap-3 pb-2 pt-1 mb-2">
                <input 
                  type="checkbox" 
                  id="safety-agreement"
                  className="mt-1 h-4 w-4 rounded border-primary text-primary focus:ring-primary accent-primary"
                  checked={safetyChecked}
                  onChange={(e) => setSafetyChecked(e.target.checked)}
                />
                <label htmlFor="safety-agreement" className="text-sm font-medium leading-tight text-foreground cursor-pointer select-none">
                  I agree to the Terms of Service, Privacy Policy, and I strictly agree to only meet buyers/sellers in public, populated spaces for my safety.
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
                <Button 
                  variant="outline" 
                  className="h-11 border-0 bg-muted px-6 font-semibold hover:bg-muted/80 w-full sm:w-auto"
                  onClick={() => {
                    supabase.auth.signOut();
                    setShowModal(false);
                  }}
                >
                  Sign Out
                </Button>
                <Button 
                  className="h-11 bg-primary px-6 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 w-full sm:w-auto disabled:opacity-50"
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending || !safetyChecked}
                >
                  {acceptMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  I Accept & Continue
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
