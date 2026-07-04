import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rocket, Award, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { StringPremiumIcon } from "@/components/business/VerificationBadge";
import { playPremiumMatchChime } from "@/hooks/useAudioSignals";

export default function BusinessBoost() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [loadingPayment, setLoadingPayment] = useState(false);

  const handleBoosterPayment = async () => {
    if (!user?.email) {
      toast.error("Please log in to continue");
      return;
    }
    if (!business?.id) {
      toast.error("No business profile loaded");
      return;
    }

    setLoadingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: {
          email: user.email,
          total: boosterPrice,
          businessId: business.id,
          metadata: {
            type: "booster",
            business_id: business.id,
          }
        }
      });

      if (error) throw error;
      if (data?.authorization_url) {
        toast.success("Redirecting to Squad secure checkout...");
        window.location.assign(data.authorization_url);
      } else {
        throw new Error(data?.error || "Failed to initialize booster payment");
      }
    } catch (err: any) {
      console.error("Booster payment initialization error:", err);
      toast.error(err.message || "Could not connect to Squad. Please try again.");
    } finally {
      setLoadingPayment(false);
    }
  };

  // 1. Fetch booster price dynamically configured by admins
  const { data: boosterPrice = 15000, isLoading: loadingPrice } = useQuery({
    queryKey: ["visibility-booster-price"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "booster_monthly_price")
          .maybeSingle();

        if (error || !data) throw new Error("Fallback");
        return Number(data.value);
      } catch {
        const stored = localStorage.getItem("booster_monthly_price");
        return stored ? Number(stored) : 15000;
      }
    }
  });

  const activateBoost = useMutation({
    mutationFn: async () => {
      if (!business?.id) throw new Error("No business profile loaded.");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await (supabase as any)
        .from("businesses")
        .update({
          verification_tier: "premium",
          verified: true
        })
        .eq("id", business.id);

      if (error) throw error;

      const { error: subscriptionError } = await (supabase as any)
        .from("premium_subscriptions")
        .upsert({
          business_id: business.id,
          status: "active",
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          amount_paid: boosterPrice,
        }, { onConflict: "business_id" });

      if (subscriptionError) throw subscriptionError;

      await supabase.from("notifications").insert({
        user_id: user?.id,
        type: "email_dispatch",
        title: "[Email] Visibility Booster Active - String",
        message: "Your paid Visibility Booster has been activated! premium badge awarded.",
        data: {
          email_type: "booster_active",
          subject: "Visibility Booster Activated! 🚀",
          body: `Hi ${business.company_name || 'Partner'}, your payment has been processed successfully. Your Gold Elite Premium badge has been awarded, and search prioritization weights are engaged.`
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
      queryClient.invalidateQueries({ queryKey: ["my-location-request"] });
      
      // Play premium glowing sound signals!
      try {
        playPremiumMatchChime();
      } catch (err) {
        console.warn("Audio synthesizer failed:", err);
      }

      toast.success("Visibility Booster activated! Search prioritizations are engaged.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Booster checkout failed.");
    }
  });

  const isPremium = business?.verification_tier === "premium";

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-6 pb-20 animate-fade-in">
        
        {/* Header Navigation */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/business/profile")}
            className="h-9 w-9 rounded-full border border-border/40 hover:bg-accent flex items-center justify-center transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
              Visibility Booster
            </h1>
            <p className="text-xs text-muted-foreground">Maximize search weighting & platforms matches (Paid)</p>
          </div>
        </div>

        {isPremium ? (
          
          /* ACTIVE BOOSTER CARD */
          <div className="dashboard-card border-orange-500/20 bg-gradient-to-br from-orange-500/[0.02] to-yellow-500/[0.01] p-6 text-center space-y-5 relative overflow-hidden rounded-[32px] shadow-lg shadow-orange-500/5">
            <div className="absolute -inset-10 bg-gradient-to-r from-orange-500/10 to-yellow-500/5 blur-3xl rounded-full" />
            <div className="relative mx-auto h-20 w-20 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center border-0 shadow-lg shadow-orange-500/20 animate-pulse">
              <StringPremiumIcon className="h-10 w-10 text-white" />
            </div>

            <div className="space-y-2 relative">
              <h2 className="text-lg font-bold text-foreground">Booster Currently Active!</h2>
              <p className="text-xs leading-relaxed text-muted-foreground max-w-xs mx-auto">
                Excellent! Your Visibility Booster is actively engaged. Your products and services are ranked at the top of client searches with 100% match weights.
              </p>
            </div>

            <div className="p-4 bg-muted/40 rounded-2xl text-left border border-border/10 text-xs space-y-2 relative">
              <p className="flex justify-between"><span className="text-muted-foreground">Booster Tier:</span> <span className="font-bold text-orange-500">Gold Elite Partner</span></p>
              <p className="flex justify-between"><span className="text-muted-foreground">Match weight priority:</span> <span className="font-semibold text-primary">Maximum (100%)</span></p>
              <p className="flex justify-between"><span className="text-muted-foreground">Premium Badge:</span> <span className="font-semibold text-foreground flex items-center gap-1">Awarded <StringPremiumIcon className="h-3.5 w-3.5 text-orange-500" /></span></p>
            </div>

            <button 
              onClick={() => navigate("/business/profile")}
              className="w-full text-center py-2.5 bg-muted hover:bg-muted/80 rounded-xl font-bold text-xs text-foreground transition-all duration-300 relative"
            >
              Back to Profile
            </button>
          </div>

        ) : (

          /* PROMOTIONAL & PURCHASE SHEET */
          <div className="space-y-5">
            
            {/* Promo grid */}
            <div className="dashboard-card p-6 space-y-5 rounded-[32px]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                  <Rocket className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Visibility Booster</h3>
                  <p className="text-xs text-muted-foreground">Reach up to 10x more customer feeds</p>
                </div>
              </div>

              <div className="grid gap-3 text-xs leading-relaxed">
                <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-2xl border border-border/10">
                  <Sparkles className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground">Gold Elite Badge Awarded</p>
                    <p className="text-muted-foreground">Unique golden stars emblem pinned next to your name in Discover feeds and checkout boxes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-2xl border border-border/10">
                  <Award className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground">100% Smart MatchWeight</p>
                    <p className="text-muted-foreground">Automatically ranked as the number one match query when clients search matching trades.</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Pricing Display */}
              <div className="border-t border-border/20 pt-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Booster Fee</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1.5">
                    ₦{boosterPrice.toLocaleString()}
                    <span className="text-xs font-semibold text-muted-foreground"> / month</span>
                  </p>
                </div>
                
                <Button 
                  onClick={handleBoosterPayment}
                  disabled={loadingPayment}
                  className="rounded-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white font-bold text-xs px-5 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                >
                  {loadingPayment ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-white" />
                      Initializing...
                    </>
                  ) : (
                    "Boost Now"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
