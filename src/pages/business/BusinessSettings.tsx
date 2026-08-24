import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReferral } from "@/hooks/useReferral";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Save,
  User,
  Store,
  Wallet,
  Gift,
  Shield,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StructuredLocationSelection, formatStructuredLocation, getLocationCoords } from "@/hooks/useStructuredLocations";

import { BusinessStoreProfileForm } from "@/components/business/settings/BusinessStoreProfileForm";
import { BusinessWalletSettings } from "@/components/business/settings/BusinessWalletSettings";
import { BusinessThemeSettings } from "@/components/business/settings/BusinessThemeSettings";

interface BusinessData {
  id?: string;
  company_name?: string;
  industry?: string;
  business_location?: string;
  products_services?: string;
  website?: string;
  cover_image_url?: string;
  logo_url?: string;
  location_area_id?: string;
  location_street_id?: string;
  location_landmark_id?: string;
  latitude?: number;
  longitude?: number;
  location_verified?: boolean;
}

export default function BusinessSettings() {
  usePageMeta({
    title: "Merchant Operating & Account Settings",
    description: "Manage operating hours, payout bank details, campus location, and store notifications.",
    keywords: ["business settings","operating hours","payout details"],
    });

  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { referralCode, totalReferrals, totalPoints } = useReferral();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [structuredLocation, setStructuredLocation] = useState<StructuredLocationSelection | null>(null);
  const [saving, setSaving] = useState(false);

  // Accordion State
  const [expandedSection, setExpandedSection] = useState<string | null>("profile");

  // Wallet and configs
  const [businessWallet, setBusinessWallet] = useState<{
    available_balance: number;
    pending_escrow: number;
  } | null>(null);
  const [withdrawConfig, setWithdrawConfig] = useState({ allow: false, minSpend: 5000 });
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchBusinessProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setBusinessData(data);

          // Fetch business wallet
          const { data: walletData } = await supabase
            .from("business_wallets")
            .select("available_balance, pending_escrow")
            .eq("business_id", data.id)
            .maybeSingle();

          if (walletData) {
            setBusinessWallet(walletData);
          }
        }
      } catch (err: any) {
        console.warn("Failed to fetch business data:", err);
      }
    };

    fetchBusinessProfile();
  }, [user]);

  // Realtime synchronization for Business, Profile, and Wallet in Settings
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`biz-settings-realtime-${user.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "businesses",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setBusinessData(payload.new as BusinessData);
          }
          queryClient.invalidateQueries({ queryKey: ["business"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newProfile = payload.new as any;
          if (newProfile.full_name) setFullName(newProfile.full_name);
          if (newProfile.phone) setPhone(newProfile.phone);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  useEffect(() => {
    const fetchWithdrawData = async () => {
      if (!user) return;
      try {
        const { data: configs } = await supabase.from("system_settings").select("*");
        if (configs) {
          const allowVal = configs.find(c => c.key === "allow_coupon_withdrawal")?.value;
          const minSpendVal = configs.find(c => c.key === "min_spend_for_withdrawal")?.value;
          setWithdrawConfig({
            allow: allowVal === true || allowVal === "true",
            minSpend: Number(minSpendVal) || 5000
          });
        }

        let query = supabase.from("withdrawal_requests").select("*");
        if (businessData?.id) {
          query = query.or(`user_id.eq.${user.id},business_id.eq.${businessData.id}`);
        } else {
          query = query.eq("user_id", user.id);
        }

        const { data: wds } = await query.order("created_at", { ascending: false });
        if (wds) setWithdrawHistory(wds);
      } catch (err) {
        console.warn("Failed to load withdrawal details:", err);
      }
    };
    fetchWithdrawData();
  }, [user, businessData]);

  const toggleSection = (sec: string) => {
    setExpandedSection(prev => prev === sec ? null : sec);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // 1. Update personal profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
          onboarding_completed: true,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // 2. Save or upsert business profile
      let formattedLoc = businessData?.business_location || "";
      let coords: { latitude: number | null; longitude: number | null } = {
        latitude: businessData?.latitude || null,
        longitude: businessData?.longitude || null,
      };

      if (structuredLocation) {
        formattedLoc = formatStructuredLocation(structuredLocation);
        const computedCoords = getLocationCoords(structuredLocation);
        if (computedCoords) coords = computedCoords;
      }

      const dbLandmarkId = structuredLocation?.landmark?.id && !structuredLocation.landmark.id.startsWith("default-")
        ? structuredLocation.landmark.id
        : businessData?.location_landmark_id;

      if (businessData || structuredLocation) {
        const { error: bizError } = await supabase
          .from("businesses")
          .upsert({
            user_id: user.id,
            company_name: businessData?.company_name || fullName || "My Merchant Shop",
            industry: businessData?.industry || "Retail",
            business_location: formattedLoc || undefined,
            street_address: formattedLoc || undefined,
            area_name: structuredLocation?.area?.name || businessData?.area_name || undefined,
            products_services: businessData?.products_services || "",
            website: businessData?.website || "",
            location_area_id: structuredLocation?.area?.id || businessData?.location_area_id,
            location_street_id: structuredLocation?.street?.id || businessData?.location_street_id,
            location_landmark_id: dbLandmarkId,
            latitude: coords.latitude,
            longitude: coords.longitude,
            location_verified: coords.latitude && coords.longitude ? true : (businessData?.location_verified || false),
          }, { onConflict: "user_id" });

        if (bizError) throw bizError;
      }

      queryClient.invalidateQueries({ queryKey: ["business"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      await refreshProfile();
      toast({ title: "Settings Saved", description: "Your profile has been updated successfully in real-time." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save Failed", description: err.message || "Could not save profile settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12 text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/10 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Merchant Settings Studio</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Manage your store presence, payouts, and personal details.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="google-input-button self-start sm:self-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Accordion Categories */}
        <div className="space-y-4">
          
          {/* CATEGORY 1: Uninitialized Store Setup Notice */}
          {!businessData && (
            <BusinessLaunchStoreCard
              userId={user?.id}
              onStoreLaunched={async () => {
                queryClient.invalidateQueries({ queryKey: ["business"] });
                queryClient.invalidateQueries({ queryKey: ["profile"] });
                await refreshProfile();
              }}
            />
          )}

          {/* CATEGORY 2: Personal Profile */}
          <div className="border border-border/20 rounded-2xl bg-card overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection("profile")}
              className="w-full p-5 flex items-center justify-between hover:bg-muted/10 transition-colors text-left"
            >
              <div className="flex items-center gap-3 font-semibold text-sm text-foreground">
                <User className="h-4 w-4 text-primary" />
                <span>Personal Profile Settings</span>
              </div>
              {expandedSection === "profile" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {expandedSection === "profile" && (
              <div className="p-5 border-t border-border/10 space-y-4">
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
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="google-input"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="google-input bg-muted/40 text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-[11px] text-muted-foreground">Managed by your authentication account.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY 3: Business Details */}
          {businessData && (
            <div className="border border-border/20 rounded-2xl bg-card overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection("business")}
                className="w-full p-5 flex items-center justify-between hover:bg-muted/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3 font-semibold text-sm text-foreground">
                  <Store className="h-4 w-4 text-primary" />
                  <span>Business Profile & Storefront</span>
                </div>
                {expandedSection === "business" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {expandedSection === "business" && (
                <BusinessStoreProfileForm
                  businessData={businessData}
                  setBusinessData={setBusinessData}
                  structuredLocation={structuredLocation}
                  setStructuredLocation={setStructuredLocation}
                  userId={user?.id}
                  refreshProfile={refreshProfile}
                />
              )}
            </div>
          )}



          {/* CATEGORY 5: Referral Program */}
          <div className="border border-border/20 rounded-2xl bg-card overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection("referral")}
              className="w-full p-5 flex items-center justify-between hover:bg-muted/10 transition-colors text-left"
            >
              <div className="flex items-center gap-3 font-semibold text-sm text-foreground">
                <Gift className="h-4 w-4 text-primary" />
                <span>Referral Program</span>
              </div>
              {expandedSection === "referral" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {expandedSection === "referral" && (
              <div className="p-5 border-t border-border/10 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border/10">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold uppercase">Total Referral Earnings</span>
                    <p className="text-2xl font-bold text-foreground">₦{totalPoints.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold uppercase">Referred Merchants</span>
                    <p className="text-2xl font-bold text-foreground">{totalReferrals}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Your Referral Link</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/auth?ref=${referralCode}`}
                      className="google-input font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${referralCode}`);
                        toast({ title: "Link Copied!", description: "Share your referral link with new merchants." });
                      }}
                      className="rounded-xl font-bold text-xs shrink-0"
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY 6: Security & Booster */}
          <div className="border border-border/20 rounded-2xl bg-card overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection("security")}
              className="w-full p-5 flex items-center justify-between hover:bg-muted/10 transition-colors text-left"
            >
              <div className="flex items-center gap-3 font-semibold text-sm text-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>Security & KYC Verification</span>
              </div>
              {expandedSection === "security" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {expandedSection === "security" && (
              <div className="p-5 border-t border-border/10 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/10 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-foreground">Identity & Shop Verification</p>
                    <p className="text-xs text-muted-foreground">
                      Verify your identity to increase your withdrawal limits and get the verified badge.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => navigate("/business/verify")}
                    className="rounded-xl font-bold text-xs shrink-0"
                  >
                    Go to Verification Center
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/10 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-foreground">Search Visibility Booster</p>
                    <p className="text-xs text-muted-foreground">
                      Activate premium booster to appear at the top of campus category searches.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/business/boost")}
                    className="rounded-xl font-bold text-xs shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Manage Booster
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY 7: Appearance */}
          <div className="border border-border/20 rounded-2xl bg-card overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection("appearance")}
              className="w-full p-5 flex items-center justify-between hover:bg-muted/10 transition-colors text-left"
            >
              <div className="flex items-center gap-3 font-semibold text-sm text-foreground">
                <Palette className="h-4 w-4 text-primary" />
                <span>Appearance & Theme Customize</span>
              </div>
              {expandedSection === "appearance" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {expandedSection === "appearance" && (
              <BusinessThemeSettings />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
