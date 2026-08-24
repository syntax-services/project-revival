import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserLocation } from "@/hooks/useLocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemeCustomizer } from "@/components/ui/theme-customizer";
import { TagInput } from "@/components/ui/tag-input";
import { useReferral } from "@/hooks/useReferral";
import { StructuredLocationPicker } from "@/components/location/StructuredLocationPicker";
import { StructuredLocationSelection, formatStructuredLocation, getLocationCoords } from "@/hooks/useStructuredLocations";
import { cn } from "@/lib/utils";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionErrors";
import {
  User,
  MapPin,
  Save,
  LogOut,
  Palette,
  Gift,
  Copy,
  Star,
  Sliders,
  Shield,
  Bell,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

interface CustomerData {
  id?: string;
  interests: string[];
  preferred_categories: string[];
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_area_id?: string | null;
  location_street_id?: string | null;
  location_landmark_id?: string | null;
}

interface MarketplaceSettings {
  profile_visibility: boolean;
  activity_status: boolean;
  local_search_radius_km: number;
  notify_new_chats: boolean;
  notify_new_bids: boolean;
  notify_order_updates: boolean;
  notify_email_newsletters: boolean;
  two_factor_auth_enabled: boolean;
  biometrics_enabled: boolean;
  budget_alert_min: number;
  budget_alert_max: number;
}

const ToggleSwitch = ({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-border/25 last:border-0">
    <div className="space-y-0.5 max-w-[80%]">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5.5 w-9.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-background shadow-md transition duration-250 ease-in-out",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  </div>
);

export default function CustomerSettings() {
  usePageMeta({
    title: "Account & Privacy Settings",
    description: "Customize notification preferences, change password, and manage security options.",
    keywords: ["account settings","security"],
    });

  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { location, loading: locationLoading, requestLocation } = useUserLocation();
  const { referralCode, totalReferrals, totalPoints } = useReferral();
  
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [structuredLocation, setStructuredLocation] = useState<StructuredLocationSelection | null>(null);
  const [initialLocation, setInitialLocation] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData>({
    interests: [],
    preferred_categories: [],
    location: null,
  });
  const [marketSettings, setMarketSettings] = useState<MarketplaceSettings>({
    profile_visibility: true,
    activity_status: true,
    local_search_radius_km: 15,
    notify_new_chats: true,
    notify_new_bids: true,
    notify_order_updates: true,
    notify_email_newsletters: false,
    two_factor_auth_enabled: false,
    biometrics_enabled: false,
    budget_alert_min: 0,
    budget_alert_max: 10000000,
  });
  const [saving, setSaving] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [verifyingIdentity, setVerifyingIdentity] = useState(false);

  const handleVerifyIdentity = async () => {
    if (!user) return;

    setVerifyingIdentity(true);
    try {
      const { data, error } = await supabase.functions.invoke("didit-session", {
        body: {
          session_kind: "customer",
          callback: window.location.href,
        },
      });

      if (error) {
        throw new Error(await getEdgeFunctionErrorMessage(error, "Failed to start Didit verification."));
      }
      if (data?.url) {
        window.location.assign(data.url);
      } else {
        throw new Error("Failed to initialize verification session.");
      }
    } catch (err: any) {
      console.error("Verification failed:", err);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: err.message || err.toString(),
      });
    } finally {
      setVerifyingIdentity(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  // Realtime settings & customer sync
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel(`cust-settings-realtime-${user.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "customer_marketplace_settings",
          filter: customerData.id ? `customer_id=eq.${customerData.id}` : undefined,
        },
        (payload) => {
          const settings = payload.new;
          if (settings) {
            setMarketSettings({
              profile_visibility: settings.profile_visibility,
              activity_status: settings.activity_status,
              local_search_radius_km: Number(settings.local_search_radius_km || 15),
              notify_new_chats: settings.notify_new_chats,
              notify_new_bids: settings.notify_new_bids,
              notify_order_updates: settings.notify_order_updates,
              notify_email_newsletters: settings.notify_email_newsletters,
              two_factor_auth_enabled: settings.two_factor_auth_enabled,
              biometrics_enabled: settings.biometrics_enabled,
              budget_alert_min: Number(settings.budget_alert_min || 0),
              budget_alert_max: Number(settings.budget_alert_max || 10000000),
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const customer = payload.new as any;
          if (customer) {
            setCustomerData((prev) => ({
              ...prev,
              interests: customer.interests || [],
              preferred_categories: customer.preferred_categories || [],
              location: customer.location,
              latitude: customer.latitude,
              longitude: customer.longitude,
              location_area_id: customer.location_area_id,
              location_street_id: customer.location_street_id,
              location_landmark_id: customer.location_landmark_id,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, customerData.id]);

  useEffect(() => {
    const fetchCustomerAndSettings = async () => {
      if (!user) return;
      
      const { data: customer } = await supabase
        .from("customers")
        .select("id, interests, preferred_categories, location, latitude, longitude, location_area_id, location_street_id, location_landmark_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (customer) {
        setCustomerData({
          id: customer.id,
          interests: customer.interests || [],
          preferred_categories: customer.preferred_categories || [],
          location: customer.location,
          latitude: customer.latitude,
          longitude: customer.longitude,
          location_area_id: customer.location_area_id,
          location_street_id: customer.location_street_id,
          location_landmark_id: customer.location_landmark_id,
        });
        setInitialLocation(customer.location);

        // Fetch Extended settings
        const { data: settings } = await supabase
          .from("customer_marketplace_settings")
          .select("*")
          .eq("customer_id", customer.id)
          .maybeSingle();

        if (settings) {
          setMarketSettings({
            profile_visibility: settings.profile_visibility,
            activity_status: settings.activity_status,
            local_search_radius_km: Number(settings.local_search_radius_km || 15),
            notify_new_chats: settings.notify_new_chats,
            notify_new_bids: settings.notify_new_bids,
            notify_order_updates: settings.notify_order_updates,
            notify_email_newsletters: settings.notify_email_newsletters,
            two_factor_auth_enabled: settings.two_factor_auth_enabled,
            biometrics_enabled: settings.biometrics_enabled,
            budget_alert_min: Number(settings.budget_alert_min || 0),
            budget_alert_max: Number(settings.budget_alert_max || 10000000),
          });
        }
      }
    };

    fetchCustomerAndSettings();
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

      const selectedLocationLabel = structuredLocation ? formatStructuredLocation(structuredLocation) : customerData.location;
      const locationChanged = selectedLocationLabel !== initialLocation;
      const finalCoords = structuredLocation ? getLocationCoords(structuredLocation) : null;
      const finalLandmarkId = structuredLocation?.landmark?.id && !structuredLocation.landmark.id.startsWith("default-")
        ? structuredLocation.landmark.id
        : null;

      // Update customer data
      const { data: customer } = await supabase
        .from("customers")
        .update({
          interests: customerData.interests,
          preferred_categories: customerData.preferred_categories,
          location: selectedLocationLabel,
          latitude: finalCoords ? finalCoords.latitude : customerData.latitude,
          longitude: finalCoords ? finalCoords.longitude : customerData.longitude,
          location_area_id: structuredLocation?.area.id ?? customerData.location_area_id ?? null,
          location_street_id: structuredLocation?.street.id ?? customerData.location_street_id ?? null,
          location_landmark_id: structuredLocation ? finalLandmarkId : (customerData.location_landmark_id ?? null),
          location_verified: locationChanged ? false : undefined,
        })
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (finalCoords) {
        await supabase
          .from("profiles")
          .update({
            latitude: finalCoords.latitude,
            longitude: finalCoords.longitude,
          })
          .eq("user_id", user.id);
      }
      setInitialLocation(selectedLocationLabel);

      if (customer) {
        // Update extended settings
        const { error: settingsError } = await supabase
          .from("customer_marketplace_settings")
          .update({
            profile_visibility: marketSettings.profile_visibility,
            activity_status: marketSettings.activity_status,
            local_search_radius_km: marketSettings.local_search_radius_km,
            notify_new_chats: marketSettings.notify_new_chats,
            notify_new_bids: marketSettings.notify_new_bids,
            notify_order_updates: marketSettings.notify_order_updates,
            notify_email_newsletters: marketSettings.notify_email_newsletters,
            two_factor_auth_enabled: marketSettings.two_factor_auth_enabled,
            biometrics_enabled: marketSettings.biometrics_enabled,
            budget_alert_min: marketSettings.budget_alert_min,
            budget_alert_max: marketSettings.budget_alert_max,
          })
          .eq("customer_id", customer.id);

        if (settingsError) throw settingsError;
      }

      await refreshProfile();
      
      toast({
        title: "Settings saved",
        description: "Your profile has been updated in real-time.",
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
      <div className="space-y-6 pb-20 lg:pb-6 max-w-lg mx-auto text-left">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-xs text-muted-foreground uppercase tracking-widest">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile Section */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent">
              <User className="h-4.5 w-4.5 text-accent-foreground" />
            </div>
            <h2 className="font-medium text-sm text-foreground uppercase tracking-wider">Profile Info</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-xs text-muted-foreground">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="google-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="google-input bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="google-input"
              />
            </div>
            <div className="space-y-2">
              <StructuredLocationPicker
                label="Delivery Address / Location"
                value={structuredLocation}
                onChange={setStructuredLocation}
              />
              {!structuredLocation && customerData.location && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Current saved location: {customerData.location}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Identity Verification (NIN/BVN) Panel */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent">
              <Shield className="h-4.5 w-4.5 text-accent-foreground" />
            </div>
            <h2 className="font-medium text-sm text-foreground uppercase tracking-wider">Identity Verification</h2>
          </div>

          <div className="pt-2 space-y-3">
            {profile?.verification_level && profile.verification_level >= 2 ? (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">Account Verified</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    Your account is fully verified (Level 2).
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed leading-normal bg-muted/40 border border-border/10 p-3.5 rounded-2xl">
                  Verify your identity using Didit (NIN / Passport) to unlock full checkout and delivery privileges on the String marketplace.
                </p>
                <Button
                  onClick={handleVerifyIdentity}
                  disabled={verifyingIdentity}
                  className="w-full h-10 text-xs font-bold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {verifyingIdentity ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Starting Didit...</>
                  ) : (
                    <>Verify Identity with Didit</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search Preferences */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent">
              <Sliders className="h-4.5 w-4.5 text-accent-foreground" />
            </div>
            <h2 className="font-medium text-sm text-foreground uppercase tracking-wider">Search Preferences</h2>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Local Search Radius: {marketSettings.local_search_radius_km} km</Label>
              <input
                type="range"
                min="1"
                max="100"
                value={marketSettings.local_search_radius_km}
                onChange={(e) =>
                  setMarketSettings((prev) => ({
                    ...prev,
                    local_search_radius_km: Number(e.target.value),
                  }))
                }
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 km</span>
                <span>50 km</span>
                <span>100 km</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Interests</Label>
              <TagInput
                value={customerData.interests}
                onChange={(interests) =>
                  setCustomerData((prev) => ({ ...prev, interests }))
                }
                placeholder="Add interests..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Preferred Categories</Label>
              <TagInput
                value={customerData.preferred_categories}
                onChange={(preferred_categories) =>
                  setCustomerData((prev) => ({ ...prev, preferred_categories }))
                }
                placeholder="Add categories..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetMin" className="text-xs text-muted-foreground">Min Budget (₦)</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  value={marketSettings.budget_alert_min}
                  onChange={(e) =>
                    setMarketSettings((prev) => ({
                      ...prev,
                      budget_alert_min: Number(e.target.value),
                    }))
                  }
                  className="google-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetMax" className="text-xs text-muted-foreground">Max Budget (₦)</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  value={marketSettings.budget_alert_max}
                  onChange={(e) =>
                    setMarketSettings((prev) => ({
                      ...prev,
                      budget_alert_max: Number(e.target.value),
                    }))
                  }
                  className="google-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent">
              <Bell className="h-4.5 w-4.5 text-accent-foreground" />
            </div>
            <h2 className="font-medium text-sm text-foreground uppercase tracking-wider">Notifications</h2>
          </div>

          <div className="divide-y divide-border/25 pt-2">
            <ToggleSwitch
              checked={marketSettings.notify_new_chats}
              onChange={(val) =>
                setMarketSettings((prev) => ({ ...prev, notify_new_chats: val }))
              }
              label="New Messages"
              description="Receive push notifications for new incoming chats."
            />
            <ToggleSwitch
              checked={marketSettings.notify_new_bids}
              onChange={(val) =>
                setMarketSettings((prev) => ({ ...prev, notify_new_bids: val }))
              }
              label="Job Bids & Quotes"
              description="Be notified immediately when a provider submits a quote."
            />
            <ToggleSwitch
              checked={marketSettings.notify_order_updates}
              onChange={(val) =>
                setMarketSettings((prev) => ({ ...prev, notify_order_updates: val }))
              }
              label="Order Progress Updates"
              description="Receive notifications for shifts in order status."
            />
            <ToggleSwitch
              checked={marketSettings.notify_email_newsletters}
              onChange={(val) =>
                setMarketSettings((prev) => ({ ...prev, notify_email_newsletters: val }))
              }
              label="Newsletter & Deals"
              description="Periodic emails featuring discounts and new features."
            />
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent">
              <Shield className="h-4.5 w-4.5 text-accent-foreground" />
            </div>
            <h2 className="font-medium text-sm text-foreground uppercase tracking-wider">Privacy & Security</h2>
          </div>

          <div className="divide-y divide-border/25 pt-2">
            <ToggleSwitch
              checked={marketSettings.profile_visibility}
              onChange={(val) =>
                setMarketSettings((prev) => ({ ...prev, profile_visibility: val }))
              }
              label="Public Profile Visibility"
              description="Allow business operators to view your basic profile card."
            />
            <ToggleSwitch
              checked={marketSettings.activity_status}
              onChange={(val) =>
                setMarketSettings((prev) => ({ ...prev, activity_status: val }))
              }
              label="Online Activity Status"
              description="Display an active indicator when you are exploring categories."
            />
            <ToggleSwitch
              checked={marketSettings.two_factor_auth_enabled}
              onChange={(val) =>
                setMarketSettings((prev) => ({ ...prev, two_factor_auth_enabled: val }))
              }
              label="Two-Factor Authentication (2FA)"
              description="Enforce verification code requirements upon sign-in attempts."
            />
            <ToggleSwitch
              checked={marketSettings.biometrics_enabled}
              onChange={(val) =>
                setMarketSettings((prev) => ({ ...prev, biometrics_enabled: val }))
              }
              label="Biometrics Authentication"
              description="Unlock the local mobile container using fingerprint or Face ID."
            />
          </div>
        </div>

        {/* Location Access */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent">
              <MapPin className="h-4.5 w-4.5 text-accent-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-sm text-foreground uppercase tracking-wider">GPS Location</h2>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={requestLocation}
            disabled={locationLoading}
            className="w-full rounded-2xl h-11 border-border/40 active:scale-95 transition-transform"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {locationLoading ? "Getting location..." : "Update GPS Coordinates"}
          </Button>
          {location && (
            <p className="text-[11px] text-muted-foreground text-center">
              Coordinates secured: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          )}
        </div>

        {/* Theme customization */}
        <div className="dashboard-card space-y-4 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent">
              <Palette className="h-4.5 w-4.5 text-accent-foreground" />
            </div>
            <h2 className="font-medium text-sm text-foreground uppercase tracking-wider">Appearance</h2>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/10">
            <div>
              <p className="text-xs font-semibold text-foreground">Dark Theme</p>
              <p className="text-[11px] text-muted-foreground">Toggle between dark and light interface modes.</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-3">Color Palette</p>
            <ThemeCustomizer />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-2xl h-12 text-sm font-medium tracking-wide active:scale-95 transition-transform"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving Changes..." : "Save Preferences"}
          </Button>
          <Button
            variant="outline"
            onClick={signOut}
            className="flex-1 rounded-2xl h-12 border-border/40 hover:bg-destructive/5 hover:text-destructive active:scale-95 transition-all"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
