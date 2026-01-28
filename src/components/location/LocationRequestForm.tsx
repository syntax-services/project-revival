import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface LocationRequestFormProps {
  onSuccess?: () => void;
  required?: boolean;
}

export function LocationRequestForm({ onSuccess, required = false }: LocationRequestFormProps) {
  const { user, profile } = useAuth();
  const [streetAddress, setStreetAddress] = useState("");
  const [areaName, setAreaName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!streetAddress.trim()) {
      toast.error("Please enter your street address");
      return;
    }

    if (!user || !profile) {
      toast.error("Please log in first");
      return;
    }

    setLoading(true);

    try {
      // Create location request
      const { error: requestError } = await supabase
        .from("location_requests")
        .insert({
          user_id: user.id,
          user_type: profile.user_type,
          street_address: streetAddress.trim(),
          area_name: areaName.trim() || null,
        });

      if (requestError) throw requestError;

      // Update user's profile with the address (unverified)
      const table = profile.user_type === "business" ? "businesses" : "customers";
      
      const { error: updateError } = await supabase
        .from(table)
        .update({
          street_address: streetAddress.trim(),
          area_name: areaName.trim() || null,
          location_verified: false,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setSubmitted(true);
      toast.success("Location submitted for verification!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Location submit error:", error);
      toast.error(error.message || "Failed to submit location");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Location Pending Verification</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Our team will verify your location from Google Maps shortly. You'll be notified once verified.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Your Location</CardTitle>
        </div>
        <CardDescription>
          Enter your exact address. Our team will verify it on Google Maps for accurate delivery.
          {required && <span className="text-destructive ml-1">*Required</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address *</Label>
            <Textarea
              id="street"
              placeholder="E.g., Shop 5, Behind GTBank, OOU Main Gate Road, Ago-Iwoye"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Include building number, landmarks, and street name for accurate verification
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">Area / Neighborhood</Label>
            <Input
              id="area"
              placeholder="E.g., Campus Area, Town, Off-Campus"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading || !streetAddress.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Submit for Verification
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function LocationStatus({ verified, address }: { verified?: boolean; address?: string }) {
  if (!address) return null;

  return (
    <div className={`flex items-center gap-2 text-sm ${verified ? 'text-green-600' : 'text-yellow-600'}`}>
      {verified ? (
        <>
          <CheckCircle className="h-4 w-4" />
          <span>Location verified</span>
        </>
      ) : (
        <>
          <Clock className="h-4 w-4" />
          <span>Pending verification</span>
        </>
      )}
    </div>
  );
}