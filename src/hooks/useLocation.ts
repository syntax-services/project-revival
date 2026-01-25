import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface LocationData {
  latitude: number;
  longitude: number;
}

export function useUserLocation() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Location not supported",
        description: "Your browser doesn't support geolocation.",
      });
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });

        // Save to database
        if (user && profile) {
          const table = profile.user_type === "business" ? "businesses" : "customers";
          
          await supabase
            .from(table)
            .update({ latitude, longitude })
            .eq("user_id", user.id);

          // Also update profile
          await supabase
            .from("profiles")
            .update({ latitude, longitude })
            .eq("user_id", user.id);
        }

        setLoading(false);
        toast({
          title: "Location saved",
          description: "We'll use this to show you nearby matches.",
        });
      },
      (error) => {
        setLoading(false);
        setPermissionDenied(true);
        console.error("Geolocation error:", error);
        toast({
          variant: "destructive",
          title: "Location access denied",
          description: "Enable location to see nearby businesses.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000, // 10 minutes
      }
    );
  };

  return {
    location,
    loading,
    permissionDenied,
    requestLocation,
  };
}

// Calculate distance between two coordinates in km
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
