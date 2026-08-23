import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StructuredLocationPicker } from "@/components/location/StructuredLocationPicker";
import { StructuredLocationSelection, formatStructuredLocation, getLocationCoords } from "@/hooks/useStructuredLocations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CustomerRegisterBusinessModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  refreshProfile: () => Promise<void>;
  switchRole: (role: "customer" | "business") => Promise<void>;
}

export function CustomerRegisterBusinessModal({
  isOpen,
  onOpenChange,
  userId,
  refreshProfile,
  switchRole,
}: CustomerRegisterBusinessModalProps) {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<"goods" | "services" | "both">("both");
  const [structuredLocation, setStructuredLocation] = useState<StructuredLocationSelection | null>(null);
  const [registeringBusiness, setRegisteringBusiness] = useState(false);

  const handleRegisterBusiness = async () => {
    if (!businessName.trim() || !structuredLocation || !userId) {
      toast.error("Please enter a business name and structured campus location.");
      return;
    }

    setRegisteringBusiness(true);
    try {
      const formattedLocation = formatStructuredLocation(structuredLocation);
      const coords = getLocationCoords(structuredLocation);
      const dbLandmarkId = structuredLocation.landmark?.id && !structuredLocation.landmark.id.startsWith("default-")
        ? structuredLocation.landmark.id
        : null;

      // 1. Create businesses table row
      const { error: bizError } = await supabase
        .from("businesses")
        .insert({
          user_id: userId,
          company_name: businessName.trim(),
          business_type: businessType,
          business_location: formattedLocation,
          area_name: structuredLocation.area.name,
          location_area_id: structuredLocation.area.id,
          location_street_id: structuredLocation.street.id,
          location_landmark_id: dbLandmarkId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          location_verified: true,
        });

      if (bizError) throw bizError;

      // 2. Ensure profile user_type is updated
      await supabase
        .from("profiles")
        .update({ user_type: "business" })
        .eq("user_id", userId);

      // 3. Refresh profile state and switch role
      await refreshProfile();
      await switchRole("business");

      toast.success("Welcome to String Merchant Network! Directing to Merchant Studio...");
      onOpenChange(false);
      navigate("/business");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration error";
      toast.error(message || "Failed to initialize merchant profile.");
    } finally {
      setRegisteringBusiness(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-primary/20 bg-card/95 backdrop-blur-2xl text-foreground rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-primary flex items-center gap-2">
            Initialize Merchant Studio Node
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Provision a secondary merchant profile under this login. Switch back and forth anytime!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-3 text-left">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Shop / Company Name</Label>
            <Input
              placeholder="e.g. Ankara Hub, Campus Bites"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="h-9 bg-muted/20 border-border/40 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Business Type</Label>
            <Select value={businessType} onValueChange={(val: "goods" | "services" | "both") => setBusinessType(val)}>
              <SelectTrigger className="h-9 bg-muted/20 border-border/40 rounded-xl text-left">
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="goods">Goods (Apparel, Food, Tech, etc.)</SelectItem>
                <SelectItem value="services">Services (Styling, Tutoring, coding, etc.)</SelectItem>
                <SelectItem value="both">Both Goods & Services</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <StructuredLocationPicker
            label="Store pickup / delivery point"
            value={structuredLocation}
            onChange={setStructuredLocation}
            compact
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleRegisterBusiness}
            disabled={registeringBusiness || !businessName || !structuredLocation}
            className="bg-primary hover:bg-primary/95 text-white font-bold"
          >
            {registeringBusiness ? "Launching..." : "Launch Merchant Studio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
