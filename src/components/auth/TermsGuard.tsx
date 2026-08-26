import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
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
          className="max-h-[90dvh] gap-0 overflow-hidden bg-background p-0 sm:max-w-[500px] sm:rounded-lg rounded-none w-full bottom-0 top-auto translate-y-0 sm:top-[50%] sm:translate-y-[-50%] absolute sm:relative"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex flex-col overflow-hidden">
            <ScrollArea className="max-h-[85vh] px-5 py-6 sm:px-8 sm:py-8">
              <div className="space-y-6 text-sm text-foreground">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  We value your privacy & safety
                </DialogTitle>
                
                <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
                  <p>
                    We updated our terms to improve your campus shopping experience and ensure secure transactions. Necessary policies keep the platform running, while others help us protect your physical safety. Learn more in our <a href="/privacy" target="_blank" className="text-primary font-medium hover:underline">Privacy Policy</a> you can also check our <a href="/terms" target="_blank" className="text-primary font-medium hover:underline">Terms of Service</a>.
                  </p>
                  <p>
                    You can always change your account preference from the settings menu or by clicking the "Sign Out" button below.
                  </p>
                </div>

                <div className="space-y-1 pt-2">
                  <h3 className="text-[17px] font-bold text-foreground">Essential terms</h3>
                  <p className="text-[14.5px] leading-relaxed text-muted-foreground">
                    Essential for the marketplace to function. Enable escrow checkout, secure chat, and account access.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-[17px] font-bold text-foreground">Safety & Proximity</h3>
                  <p className="text-[14.5px] leading-relaxed text-muted-foreground">
                    These terms help us verify physical meetups to prevent fraud, protect your funds in escrow, and ensure safe campus trading.
                  </p>
                </div>

              </div>

              <div className="mt-8 flex flex-col gap-3">
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-[15px] font-bold border-primary text-primary hover:bg-primary/5 rounded-sm"
                  onClick={() => window.open('/terms', '_blank')}
                >
                  Read Full Terms
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-[15px] font-bold border-primary text-primary hover:bg-primary/5 rounded-sm"
                  onClick={() => {
                    supabase.auth.signOut();
                    setShowModal(false);
                  }}
                >
                  Decline & Sign Out
                </Button>
                <Button 
                  className="w-full h-12 text-[15px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm"
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                >
                  {acceptMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  Accept All Terms
                </Button>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
