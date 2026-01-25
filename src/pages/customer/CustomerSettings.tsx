import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserLocation } from "@/hooks/useLocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TagInput } from "@/components/ui/tag-input";
import {
  User,
  MapPin,
  Save,
  LogOut,
  Palette,
} from "lucide-react";

interface CustomerData {
  interests: string[];
  preferred_categories: string[];
  location: string | null;
}

export default function CustomerSettings() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { location, loading: locationLoading, requestLocation } = useUserLocation();
  
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [customerData, setCustomerData] = useState<CustomerData>({
    interests: [],
    preferred_categories: [],
    location: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("customers")
        .select("interests, preferred_categories, location")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setCustomerData({
          interests: data.interests || [],
          preferred_categories: data.preferred_categories || [],
          location: data.location,
        });
      }
    };

    fetchCustomerData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Update profile
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
        })
        .eq("user_id", user.id);

      // Update customer data
      await supabase
        .from("customers")
        .update({
          interests: customerData.interests,
          preferred_categories: customerData.preferred_categories,
          location: customerData.location,
        })
        .eq("user_id", user.id);

      await refreshProfile();
      
      toast({
        title: "Settings saved",
        description: "Your profile has been updated.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile Section */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <User className="h-5 w-5 text-accent-foreground" />
            </div>
            <h2 className="font-medium text-foreground">Profile</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="google-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="google-input bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="google-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={customerData.location || ""}
                onChange={(e) =>
                  setCustomerData((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="City, Country"
                className="google-input"
              />
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="dashboard-card space-y-4">
          <h2 className="font-medium text-foreground">Interests & Preferences</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Interests</Label>
              <TagInput
                value={customerData.interests}
                onChange={(interests) =>
                  setCustomerData((prev) => ({ ...prev, interests }))
                }
                placeholder="Add interests..."
              />
            </div>
            <div className="space-y-2">
              <Label>Preferred Categories</Label>
              <TagInput
                value={customerData.preferred_categories}
                onChange={(preferred_categories) =>
                  setCustomerData((prev) => ({ ...prev, preferred_categories }))
                }
                placeholder="Add categories..."
              />
            </div>
          </div>
        </div>

        {/* Location Access */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <MapPin className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Location</h2>
              <p className="text-sm text-muted-foreground">
                Enable location for nearby business suggestions
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={requestLocation}
            disabled={locationLoading}
            className="google-input-button"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {locationLoading ? "Getting location..." : "Update My Location"}
          </Button>
          {location && (
            <p className="text-sm text-muted-foreground">
              Location saved: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          )}
        </div>

        {/* Appearance */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <Palette className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">Toggle dark/light mode</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleSave} disabled={saving} className="google-input-button">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={signOut} className="google-input-button">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
