import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StructuredLocationPicker } from "@/components/location/StructuredLocationPicker";
import { StructuredLocationSelection, formatStructuredLocation, getLocationCoords } from "@/hooks/useStructuredLocations";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Store, Loader2, ArrowRight, ShieldAlert, CheckCircle, MailWarning } from "lucide-react";

export default function CompleteOnboarding() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [bizName, setBizName] = useState("");
  const [bizType, setBizType] = useState<"goods" | "services" | "both">("both");
  const [bizLocation, setBizLocation] = useState<StructuredLocationSelection | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user is already set up and has a business record, send them to dashboard
    if (profile?.onboarding_completed && profile.user_type === "business") {
      // Check if business record exists
      supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            navigate("/business", { replace: true });
          }
        });
    }
  }, [profile, user, navigate]);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.id) return;
    if (!bizName.trim()) {
      toast.error("Business name is required.");
      return;
    }
    if (!bizLocation) {
      toast.error("Please pick a pickup/delivery location.");
      return;
    }
    if (!agreedToTerms) {
      toast.error("You must agree to the platform safety rules.");
      return;
    }

    setLoading(true);
    try {
      const formattedLocation = formatStructuredLocation(bizLocation);
      const coords = getLocationCoords(bizLocation);
      const dbLandmarkId = bizLocation.landmark?.id && !bizLocation.landmark.id.startsWith("default-")
        ? bizLocation.landmark.id
        : null;

      // 1. Call secure onboarding RPC
      const { error: rpcError } = await supabase.rpc("complete_onboarding_setup", {
        p_full_name: profile.full_name || "Merchant",
        p_phone: profile.phone || "",
        p_user_type: "business",
        p_business_data: {
          companyName: bizName.trim(),
          businessType: bizType,
          streetAddress: formattedLocation,
          businessLocation: formattedLocation,
          areaName: bizLocation.area.name,
          latitude: coords.lat,
          longitude: coords.lng,
          locationAreaId: bizLocation.area.id,
          locationStreetId: bizLocation.street.id,
          locationLandmarkId: dbLandmarkId,
        },
        p_customer_data: null
      });

      if (rpcError) throw rpcError;

      // 2. Update coordinates on the newly created business record
      const { error: updateError } = await supabase
        .from("businesses")
        .update({
          business_location: formattedLocation,
          street_address: formattedLocation,
          area_name: bizLocation.area.name,
          location_area_id: bizLocation.area.id,
          location_street_id: bizLocation.street.id,
          location_landmark_id: dbLandmarkId,
          latitude: coords.lat,
          longitude: coords.lng,
          location_verified: true, // Auto-verify
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // 3. Set active role view
      if (user?.id) {
        localStorage.setItem(`string_active_role_view_${user.id}`, "business");
      }

      // 4. Invalidate business query caches
      queryClient.invalidateQueries({ queryKey: ["business"] });
      queryClient.invalidateQueries({ queryKey: ["business", user.id] });

      // 5. Refresh profile state
      await refreshProfile();

      toast.success(`Merchant Shop "${bizName}" successfully initialized! 🚀`);
      navigate("/business", { replace: true });
    } catch (err: any) {
      console.error("Failed to complete business onboarding:", err);
      toast.error(`Setup failed: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070a13] p-4 sm:p-6 text-foreground font-sans">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-82 w-82 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-xl animate-fade-in space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-lg shadow-indigo-500/5">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Launch Your Merchant Studio
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Set up your shop details, map your coordinates, and activate premium escrow protection.
          </p>
        </div>

        <form onSubmit={handleLaunch} className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-4">
            {/* Business Name */}
            <div className="space-y-1">
              <Label htmlFor="biz-name" className="text-xs font-semibold text-slate-300">
                Business Shop Name *
              </Label>
              <Input
                id="biz-name"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="e.g. campus corner foods"
                className="rounded-xl mt-1 border-slate-800 bg-slate-950/80 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                disabled={loading}
                required
              />
            </div>

            {/* Business Type */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-300">Business Type *</Label>
              <Select value={bizType} onValueChange={(val: any) => setBizType(val)} disabled={loading}>
                <SelectTrigger className="rounded-xl mt-1 border-slate-800 bg-slate-950/80 text-white">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-slate-950 border-slate-800 text-slate-200">
                  <SelectItem value="goods">🏪 Goods (Food, drinks, accessories, etc.)</SelectItem>
                  <SelectItem value="services">🛠️ Services (Styling, tutoring, coding, etc.)</SelectItem>
                  <SelectItem value="both">💼 Both Goods & Services</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Picker */}
            <div className="space-y-1">
              <StructuredLocationPicker
                label="Store Pickup / Delivery Point *"
                value={bizLocation}
                onChange={setBizLocation}
                compact
              />
            </div>
          </div>

          {/* Compliance & Gating Safeguard Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldAlert className="h-4 w-4 text-indigo-400" /> Platform Safety & Escrow Policies
            </h3>
            
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>Secure Escrow Flow:</strong> Customer payments are held in secure escrow. Funds are moved to your balance once the customer confirms satisfaction, or automatically after 2-3 hours.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>Off-App Delivery:</strong> Delivery coordinates are structured in the app, but physical fulfillment is completed off-app.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>No Off-Platform Transacting:</strong> Exchanging phone numbers or external payment channels inside chat to avoid platform fees or escrow is strictly prohibited and flags your account.</span>
              </li>
              <li className="flex items-start gap-2">
                <MailWarning className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span><strong>Signature Policy:</strong> String emails feature an official animated signature. Emails without a verification signature are fraudulent.</span>
              </li>
            </ul>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                disabled={loading}
              />
              <Label htmlFor="terms" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                I agree to the String Platform safety and transaction terms.
              </Label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !bizName || !bizLocation || !agreedToTerms}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deploying Studio...
              </>
            ) : (
              <>
                Launch Merchant Studio 🚀
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
