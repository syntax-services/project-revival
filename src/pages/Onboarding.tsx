import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Gift } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

export default function Onboarding() {
  const { user, profile, refreshProfile, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });

  useEffect(() => {
    if (user) {
      const metadata = user.user_metadata;
      if (metadata?.full_name && !fullName) {
        setFullName(metadata.full_name);
      }
      if (metadata?.referral_code && !referralCode) {
        setReferralCode(metadata.referral_code);
      }
    }
    if (profile) {
      if (profile.full_name && !fullName) {
        setFullName(profile.full_name);
      }
      if (profile.onboarding_completed) {
        navigate(dashboardPath, { replace: true });
      }
    }
  }, [user, profile, dashboardPath, navigate, fullName, referralCode]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (err) => console.warn("Onboarding geolocation pre-fetch skipped:", err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Complete onboarding as a customer with default/empty location data
      const { data, error } = await supabase.rpc("complete_onboarding_setup", {
        p_full_name: fullName.trim() || "User",
        p_phone: null,
        p_user_type: "customer",
        p_business_data: null,
        p_customer_data: {
          streetAddress: "N/A",
          areaName: "N/A",
          location: "Nigeria"
        } as unknown as Json,
      });

      if (error) throw error;

      const success = (data as any)?.success;
      if (!success) {
        throw new Error((data as any)?.message || "Failed to save details. Please try again.");
      }

      // Automatically store coordinates if they were successfully mined
      if (coordinates.latitude !== null && coordinates.longitude !== null) {
        try {
          await supabase
            .from("customers")
            .update({
              latitude: coordinates.latitude,
              longitude: coordinates.longitude
            })
            .eq("user_id", user.id);

          await supabase
            .from("profiles")
            .update({
              latitude: coordinates.latitude,
              longitude: coordinates.longitude
            })
            .eq("user_id", user.id);
        } catch (coordErr) {
          console.warn("Could not save mined location coordinates:", coordErr);
        }
      }

      // Claim welcome referral/coupon points if they entered one on signup
      if (referralCode.trim()) {
        try {
          const { data: refData, error: refError } = await supabase.rpc("process_referral", {
            p_referral_code: referralCode.trim().toUpperCase(),
          });
          
          if (!refError && refData && (refData as any).success) {
             toast({
               title: "Bonus Claimed! ",
               description: (refData as any).message || "Your sign-up bonus was successfully applied.",
             });
          } else if (refError || (refData && !(refData as any).success)) {
             toast({
               variant: "destructive",
               title: "Coupon code issue",
               description: (refData as any)?.message || "Invalid or expired coupon code.",
             });
          }
        } catch (refErr) {
          console.warn("Failed to process referral code from signup:", refErr);
        }
      }

      await refreshProfile();

      toast({
        title: "Welcome to String!",
        description: "Your account is ready.",
      });

      navigate("/customer", { replace: true });
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: error.message || "Failed to complete onboarding. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Welcome to String!</h1>
            <p className="text-sm text-muted-foreground">
              You're almost done. Enter a referral or coupon code if you have one.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="referralCode">Coupon / Referral Code (Optional)</Label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="referralCode"
                  placeholder="E.g. STR-VIP2026"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="pl-10 uppercase"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Apply an admin coupon code or a friend's referral code to instantly earn bonus points and cash to your wallet.
              </p>
            </div>

            <Button type="submit" className="w-full flex items-center justify-center gap-2 h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
