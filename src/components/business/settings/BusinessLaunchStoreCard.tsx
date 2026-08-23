import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Loader2, ShieldCheck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { StructuredLocationPicker } from "@/components/location/StructuredLocationPicker";
import { StructuredLocationSelection, formatStructuredLocation, getLocationCoords } from "@/hooks/useStructuredLocations";

interface BusinessLaunchStoreCardProps {
  userId?: string;
  onStoreLaunched: () => Promise<void>;
}

export function BusinessLaunchStoreCard({ userId, onStoreLaunched }: BusinessLaunchStoreCardProps) {
  const queryClient = useQueryClient();
  const [setupBizName, setSetupBizName] = useState("");
  const [setupBizType, setSetupBizType] = useState<"goods" | "services" | "both">("both");
  const [setupBizLocation, setSetupBizLocation] = useState<StructuredLocationSelection | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [registeringBusiness, setRegisteringBusiness] = useState(false);

  const handleLaunchStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupBizName.trim()) {
      toast.error("Please enter a business or shop name.");
      return;
    }
    if (!setupBizLocation) {
      toast.error("Please specify your campus pickup / delivery location.");
      return;
    }
    if (!agreedToTerms) {
      toast.error("Please accept the seller agreement to proceed.");
      return;
    }
    if (!userId) {
      toast.error("Session not found. Please log in again.");
      return;
    }

    setRegisteringBusiness(true);
    try {
      const formattedLoc = formatStructuredLocation(setupBizLocation);
      const coords = getLocationCoords(setupBizLocation);
      const dbLandmarkId = setupBizLocation.landmark?.id && !setupBizLocation.landmark.id.startsWith("default-")
        ? setupBizLocation.landmark.id
        : null;

      // 1. Insert or update the business record
      const { error: bizError } = await supabase.from("businesses").upsert({
        user_id: userId,
        company_name: setupBizName.trim(),
        business_type: setupBizType,
        business_location: formattedLoc,
        street_address: formattedLoc,
        area_name: setupBizLocation.area.name,
        location_area_id: setupBizLocation.area.id,
        location_street_id: setupBizLocation.street.id,
        location_landmark_id: dbLandmarkId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        location_verified: true,
        industry: setupBizType === "goods" ? "Retail" : setupBizType === "services" ? "Services" : "General",
        verification_tier: "basic",
      }, { onConflict: "user_id" });

      if (bizError) throw bizError;

      // 2. Ensure profile user_type is set to business
      await supabase
        .from("profiles")
        .update({
          user_type: "business",
          onboarding_completed: true,
        })
        .eq("user_id", userId);

      // Invalidate queries so that UI state refreshes instantly
      queryClient.invalidateQueries({ queryKey: ["business"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      toast.success("Your store is now active and live on String.");
      await onStoreLaunched();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration error";
      toast.error(message || "Failed to launch store");
    } finally {
      setRegisteringBusiness(false);
    }
  };

  return (
    <div className="border border-primary/20 rounded-2xl bg-primary/5 overflow-hidden shadow-md text-left">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Launch Your Merchant Store</h3>
            <p className="text-xs text-muted-foreground">Complete quick setup to start receiving orders and payments.</p>
          </div>
        </div>

        <form onSubmit={handleLaunchStore} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="setupName">Store / Business Name</Label>
            <Input
              id="setupName"
              placeholder="e.g. Ago Iwoye Fast Bites"
              value={setupBizName}
              onChange={(e) => setSetupBizName(e.target.value)}
              className="google-input"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Business Category</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["goods", "services", "both"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={setupBizType === type ? "default" : "outline"}
                  onClick={() => setSetupBizType(type)}
                  className="h-9 rounded-xl capitalize font-semibold text-xs"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <StructuredLocationPicker
              label="Store pickup / delivery point"
              value={setupBizLocation}
              onChange={setSetupBizLocation}
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 rounded border-border/20 text-primary focus:ring-primary/20"
            />
            <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
              I agree to the String Merchant Guidelines and verify that I am operating ethically within the campus community.
            </label>
          </div>

          <Button
            type="submit"
            disabled={registeringBusiness || !setupBizName || !setupBizLocation || !agreedToTerms}
            className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            {registeringBusiness ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Launching Store...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Launch Merchant Studio
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
