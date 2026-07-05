import { useState, useEffect, useRef } from "react";
import { optimizeImage } from "@/lib/imageOptimizer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserLocation } from "@/hooks/useLocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemeCustomizer } from "@/components/ui/theme-customizer";
import { useReferral } from "@/hooks/useReferral";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { StructuredLocationPicker } from "@/components/location/StructuredLocationPicker";
import { StructuredLocationSelection, formatStructuredLocation, getLocationCoords } from "@/hooks/useStructuredLocations";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionErrors";
import {
  Building2,
  MapPin,
  Save,
  LogOut,
  Palette,
  Upload,
  Image,
  Gift,
  Copy,
  Star,
  ShieldCheck,
  CreditCard,
  Loader2,
  ChevronDown,
  Store,
  AlertTriangle,
  User,
} from "lucide-react";

interface BusinessData {
  id: string;
  company_name: string;
  industry: string | null;
  business_location: string | null;
  products_services: string | null;
  website: string | null;
  cover_image_url: string | null;
  location_verified?: boolean;
  verification_tier?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_area_id?: string | null;
  location_street_id?: string | null;
  location_landmark_id?: string | null;
}

export default function BusinessSettings() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { location, loading: locationLoading, requestLocation } = useUserLocation();
  const { referralCode, totalReferrals, totalPoints } = useReferral();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [structuredLocation, setStructuredLocation] = useState<StructuredLocationSelection | null>(null);
  const [initialLocation, setInitialLocation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Accordion State
  const [expandedSection, setExpandedSection] = useState<string | null>("profile");

  // Launch Store States
  const [setupBizName, setSetupBizName] = useState("");
  const [setupBizType, setSetupBizType] = useState<"goods" | "services" | "both">("both");
  const [setupBizLocation, setSetupBizLocation] = useState<StructuredLocationSelection | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [registeringBusiness, setRegisteringBusiness] = useState(false);

  // Withdrawal & Wallet States
  const [withdrawalType, setWithdrawalType] = useState<"business" | "coupon">("business");
  const [businessWallet, setBusinessWallet] = useState<{
    available_balance: number;
    pending_escrow: number;
  } | null>(null);
  const [withdrawConfig, setWithdrawConfig] = useState({ allow: false, minSpend: 5000 });
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);

  // Funding States
  const [fundingAmount, setFundingAmount] = useState("");
  const [funding, setFunding] = useState(false);

  const handleFundWallet = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user?.email) {
      toast({ variant: "destructive", title: "Error", description: "User email not found. Please log in again." });
      return;
    }

    const amountNum = Number(fundingAmount);
    if (!amountNum || amountNum <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount to deposit." });
      return;
    }

    setFunding(true);
    try {
      const { data, error } = await supabase.functions.invoke("initialize-payment", {
        body: {
          email: user.email,
          total: amountNum,
          metadata: {
            type: "funding",
            user_id: user.id
          }
        }
      });

      if (error) {
        throw new Error(await getEdgeFunctionErrorMessage(error, "Could not connect to Squad."));
      }

      if (data?.authorization_url) {
        toast({ title: "Redirecting...", description: "Redirecting to Squad secure checkout page." });
        window.location.assign(data.authorization_url);
      } else {
        throw new Error(data?.error || "Failed to initialize deposit");
      }
    } catch (err: any) {
      console.error("Deposit error:", err);
      toast({ variant: "destructive", title: "Deposit Failed", description: err.message || "Could not connect to Squad." });
    } finally {
      setFunding(false);
    }
  };

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

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    const amount = Number(withdrawAmount);
    
    // Validation based on withdrawal type
    if (withdrawalType === "coupon") {
      if (!amount || amount <= 0 || amount > (profile.coupon_balance || 0)) {
        toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount within your coupon balance." });
        return;
      }
      if (!withdrawConfig.allow) {
        toast({ variant: "destructive", title: "Withdrawals locked", description: "Coupon cash withdrawals are currently disabled by admin." });
        return;
      }
    } else {
      if (!businessData) {
        toast({ variant: "destructive", title: "Business Not Found", description: "No business profile associated with this account." });
        return;
      }
      if (!amount || amount <= 0 || amount > (businessWallet?.available_balance || 0)) {
        toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount within your sales balance." });
        return;
      }
    }

    setWithdrawing(true);
    try {
      const insertPayload: any = {
        amount: amount,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        withdrawal_type: withdrawalType,
        status: "pending"
      };

      if (withdrawalType === "coupon") {
        insertPayload.user_id = user.id;
      } else {
        insertPayload.business_id = businessData.id;
      }

      const { data: withdrawReq, error: insertError } = await supabase
        .from("withdrawal_requests")
        .insert(insertPayload)
        .select("*")
        .single();

      if (insertError) throw insertError;

      if (withdrawalType === "coupon") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ coupon_balance: Number(profile.coupon_balance || 0) - amount })
          .eq("user_id", user.id);

        if (profileError) throw profileError;
      } else {
        const newBalance = Number(businessWallet?.available_balance || 0) - amount;
        const { error: walletError } = await supabase
          .from("business_wallets")
          .update({ available_balance: newBalance })
          .eq("business_id", businessData.id);

        if (walletError) throw walletError;
        
        setBusinessWallet((prev) => prev ? { ...prev, available_balance: newBalance } : null);
      }

      toast({ 
        title: "Withdrawal Requested", 
        description: `Your bank payout request of ₦${amount.toLocaleString()} has been submitted. It will be reviewed by an admin and processed within 2-3 hours.` 
      });
      
      setWithdrawAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      await refreshProfile();
      
      // refresh withdrawal history
      let query = supabase.from("withdrawal_requests").select("*");
      if (businessData?.id) {
        query = query.or(`user_id.eq.${user.id},business_id.eq.${businessData.id}`);
      } else {
        query = query.eq("user_id", user.id);
      }
      const { data: wds } = await query.order("created_at", { ascending: false });
      if (wds) setWithdrawHistory(wds);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Withdrawal failed", description: err.message || "Failed to submit withdrawal request" });
    } finally {
      setWithdrawing(false);
    }
  };


  // ── Google Place Picker Autocomplete State ──
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("businesses")
        .select("id, company_name, industry, business_location, products_services, website, cover_image_url, location_verified, verification_tier, latitude, longitude, location_area_id, location_street_id, location_landmark_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setBusinessData(data);
        setInitialLocation(data.business_location);

        // Fetch wallet details
        const { data: wallet } = await supabase
          .from("business_wallets")
          .select("available_balance, pending_escrow")
          .eq("business_id", data.id)
          .maybeSingle();

        if (wallet) {
          setBusinessWallet({
            available_balance: Number(wallet.available_balance || 0),
            pending_escrow: Number(wallet.pending_escrow || 0)
          });
        }
      } else {
        setExpandedSection("launch_store");
      }
    };

    fetchBusinessData();
  }, [user]);

  const handleRegisterBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.id) return;
    if (!setupBizName.trim()) {
      toast({ variant: "destructive", title: "Business name is required." });
      return;
    }
    if (!setupBizLocation) {
      toast({ variant: "destructive", title: "Please pick a pickup/delivery location." });
      return;
    }
    if (!agreedToTerms) {
      toast({ variant: "destructive", title: "You must agree to the platform safety rules." });
      return;
    }

    setRegisteringBusiness(true);
    try {
      const formattedLocation = formatStructuredLocation(setupBizLocation);
      const coords = getLocationCoords(setupBizLocation);
      const dbLandmarkId = setupBizLocation.landmark?.id && !setupBizLocation.landmark.id.startsWith("default-")
        ? setupBizLocation.landmark.id
        : null;

      // 1. Call secure onboarding RPC
      const { error: rpcError } = await supabase.rpc("complete_onboarding_setup", {
        p_full_name: fullName || profile.full_name || "Merchant",
        p_phone: phone || profile.phone || "",
        p_user_type: "business",
        p_business_data: {
          companyName: setupBizName.trim(),
          businessType: setupBizType,
          streetAddress: formattedLocation,
          businessLocation: formattedLocation,
          areaName: setupBizLocation.area.name,
          latitude: coords.lat,
          longitude: coords.lng,
          locationAreaId: setupBizLocation.area.id,
          locationStreetId: setupBizLocation.street.id,
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
          area_name: setupBizLocation.area.name,
          location_area_id: setupBizLocation.area.id,
          location_street_id: setupBizLocation.street.id,
          location_landmark_id: dbLandmarkId,
          latitude: coords.lat,
          longitude: coords.lng,
          location_verified: true, // Auto-verify
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // 3. Set local states to unlock settings and refresh cache
      const { data: newBiz } = await supabase
        .from("businesses")
        .select("id, company_name, industry, business_location, products_services, website, cover_image_url, location_verified, verification_tier, latitude, longitude, location_area_id, location_street_id, location_landmark_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (newBiz) {
        setBusinessData(newBiz);
        setInitialLocation(newBiz.business_location);
        setExpandedSection("business_details");
      }

      await refreshProfile();
      toast({ title: "Success! 🚀", description: `Merchant Shop "${setupBizName}" successfully initialized!` });
    } catch (err: any) {
      console.error("Failed to register business:", err);
      toast({ variant: "destructive", title: "Setup failed", description: err.message || err.toString() });
    } finally {
      setRegisteringBusiness(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessData) return;

    setUploading(true);

    try {
      const optimizedFile = await optimizeImage(file);
      const fileExt = optimizedFile.name.split(".").pop();
      const filePath = `covers/${businessData.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("business-images")
        .upload(filePath, optimizedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("business-images")
        .getPublicUrl(filePath);

      await supabase
        .from("businesses")
        .update({ cover_image_url: publicUrl })
        .eq("id", businessData.id);

      setBusinessData((prev) => prev ? { ...prev, cover_image_url: publicUrl } : null);
      
      toast({
        title: "Cover uploaded",
        description: "Your cover image has been updated.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !businessData) return;
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

      const selectedLocationLabel = structuredLocation ? formatStructuredLocation(structuredLocation) : businessData.business_location;
      const locationChanged = selectedLocationLabel !== initialLocation;

      // Update business data
      const finalCoords = structuredLocation ? getLocationCoords(structuredLocation) : null;
      const finalLandmarkId = structuredLocation?.landmark?.id && !structuredLocation.landmark.id.startsWith("default-")
        ? structuredLocation.landmark.id
        : null;

      await (supabase as any)
        .from("businesses")
        .update({
          company_name: businessData.company_name,
          industry: businessData.industry,
          business_location: selectedLocationLabel,
          products_services: businessData.products_services,
          website: businessData.website,
          latitude: finalCoords ? finalCoords.latitude : businessData.latitude,
          longitude: finalCoords ? finalCoords.longitude : businessData.longitude,
          area_name: structuredLocation?.area.name ?? undefined,
          street_address: selectedLocationLabel,
          location_area_id: structuredLocation?.area.id ?? businessData.location_area_id ?? null,
          location_street_id: structuredLocation?.street.id ?? businessData.location_street_id ?? null,
          location_landmark_id: structuredLocation ? finalLandmarkId : (businessData.location_landmark_id ?? null),
          location_verified: locationChanged ? false : businessData.location_verified,
        })
        .eq("id", businessData.id);

      if (locationChanged) {
        setBusinessData(prev => prev ? {
          ...prev,
          business_location: selectedLocationLabel,
          latitude: finalCoords ? finalCoords.latitude : prev.latitude,
          longitude: finalCoords ? finalCoords.longitude : prev.longitude,
          location_area_id: structuredLocation?.area.id ?? prev.location_area_id,
          location_street_id: structuredLocation?.street.id ?? prev.location_street_id,
          location_landmark_id: structuredLocation ? finalLandmarkId : prev.location_landmark_id,
          location_verified: false
        } : null);
        setInitialLocation(selectedLocationLabel);
      }

      await refreshProfile();
      
      toast({
        title: "Settings saved",
        description: "Your business profile has been updated.",
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
  };  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6 text-left">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your business profile, shop settings, and wallet preferences
          </p>
        </div>

        <div className="space-y-4">
          
          {/* CATEGORY 1: 🚀 Launch Store (Only visible if not onboarded yet) */}
          {!businessData && (
            <div className="border border-amber-500/20 rounded-2xl bg-card overflow-hidden shadow-md">
              <button
                onClick={() => toggleSection("launch_store")}
                className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 transition-colors text-amber-500 bg-amber-500/5"
              >
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5" />
                  <span>🚀 Launch & Initialize Merchant Studio</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expandedSection === "launch_store" && "rotate-180")} />
              </button>
              {expandedSection === "launch_store" && (
                <div className="p-5 border-t border-border/10 space-y-4">
                  <form onSubmit={handleRegisterBusiness} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="setup-biz-name" className="text-xs font-semibold">Business Shop Name *</Label>
                      <Input
                        id="setup-biz-name"
                        value={setupBizName}
                        onChange={(e) => setSetupBizName(e.target.value)}
                        placeholder="e.g. Campus Corner Cafe"
                        className="rounded-xl mt-1"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Business Type *</Label>
                      <select
                        value={setupBizType}
                        onChange={(e) => setSetupBizType(e.target.value as any)}
                        className="w-full rounded-xl border border-input bg-background px-3 h-10 text-sm focus:ring-1 focus:ring-primary mt-1"
                        required
                      >
                        <option value="goods">🏪 Goods (Food, drinks, accessories, etc.)</option>
                        <option value="services">🛠️ Services (Styling, Tutoring, coding, etc.)</option>
                        <option value="both">💼 Both Goods & Services</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <StructuredLocationPicker
                        label="Store pickup / delivery point *"
                        value={setupBizLocation}
                        onChange={setSetupBizLocation}
                        compact
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                        required
                      />
                      <label htmlFor="terms" className="text-xs text-muted-foreground select-none cursor-pointer">
                        I agree to the platform safety rules and coordinate verification policy.
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={registeringBusiness || !setupBizName || !setupBizLocation || !agreedToTerms}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
                    >
                      {registeringBusiness ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Launching...
                        </>
                      ) : (
                        <>
                          Launch Merchant Studio 🚀
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 2: 👤 Personal Profile */}
          <div className="border border-border/10 rounded-2xl bg-card overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection("profile")}
              className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 transition-colors text-foreground"
            >
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span>👤 Personal Profile Settings</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expandedSection === "profile" && "rotate-180")} />
            </button>
            {expandedSection === "profile" && (
              <div className="p-5 border-t border-border/10 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Contact Name</Label>
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
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 (555) 000-0000"
                      className="google-input"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY 3: 🏪 Business Details (Only if initialized) */}
          {businessData && (
            <div className="border border-border/10 rounded-2xl bg-card overflow-hidden shadow-sm">
              <button
                onClick={() => toggleSection("business_details")}
                className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 transition-colors text-foreground"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span>🏪 Business Profile Details</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expandedSection === "business_details" && "rotate-180")} />
              </button>
              {expandedSection === "business_details" && (
                <div className="p-5 border-t border-border/10 space-y-4">
                  {/* Cover Image Upload */}
                  <div className="space-y-3">
                    <Label>Shop Cover Image</Label>
                    <div className="relative h-40 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-border/10">
                      {businessData.cover_image_url ? (
                        <img
                          src={businessData.cover_image_url}
                          alt="Business cover"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-4xl font-bold text-primary/30">
                            {businessData.company_name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full h-9 rounded-xl text-xs"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload Cover Image"}
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company / Shop Name</Label>
                      <Input
                        id="companyName"
                        value={businessData.company_name}
                        onChange={(e) =>
                          setBusinessData((prev) => prev ? { ...prev, company_name: e.target.value } : null)
                        }
                        className="google-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry / Category</Label>
                      <Input
                        id="industry"
                        value={businessData.industry || ""}
                        onChange={(e) =>
                          setBusinessData((prev) => prev ? { ...prev, industry: e.target.value } : null)
                        }
                        className="google-input"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="website">Website Link</Label>
                      <Input
                        id="website"
                        value={businessData.website || ""}
                        onChange={(e) =>
                          setBusinessData((prev) => prev ? { ...prev, website: e.target.value } : null)
                        }
                        placeholder="https://"
                        className="google-input"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="products">Description of Offerings</Label>
                      <Textarea
                        id="products"
                        value={businessData.products_services || ""}
                        onChange={(e) =>
                          setBusinessData((prev) => prev ? { ...prev, products_services: e.target.value } : null)
                        }
                        placeholder="Describe what you offer..."
                        className="google-input min-h-[100px]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 4: 📍 Pickup/Delivery Location (Only if initialized) */}
          {businessData && (
            <div className="border border-border/10 rounded-2xl bg-card overflow-hidden shadow-sm">
              <button
                onClick={() => toggleSection("location")}
                className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 transition-colors text-foreground"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <span>📍 Pickup/Delivery Location</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expandedSection === "location" && "rotate-180")} />
              </button>
              {expandedSection === "location" && (
                <div className="p-5 border-t border-border/10 space-y-4">
                  <div className="space-y-2">
                    <StructuredLocationPicker
                      label="Store pickup / delivery point"
                      value={structuredLocation}
                      onChange={setStructuredLocation}
                    />
                    {!structuredLocation && businessData.business_location && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Current saved location: {businessData.business_location}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 5: 💳 Wallet & Bank Account (Only if initialized) */}
          {businessData && (
            <div className="border border-border/10 rounded-2xl bg-card overflow-hidden shadow-sm">
              <button
                onClick={() => toggleSection("wallet")}
                className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 transition-colors text-foreground"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span>💳 Wallet & Bank Payouts</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expandedSection === "wallet" && "rotate-180")} />
              </button>
              {expandedSection === "wallet" && (
                <div className="p-5 border-t border-border/10 space-y-5">
                  {/* Cohesive Minimalist Balance Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-muted/20 border border-border/10 p-4 flex flex-col text-left relative overflow-hidden group">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Sales Wallet</span>
                      <p className="font-extrabold text-lg text-foreground mt-1">
                        ₦{Number(businessWallet?.available_balance || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 border border-border/10 p-4 flex flex-col text-left relative overflow-hidden group">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pending Escrow</span>
                      <p className="font-extrabold text-lg text-muted-foreground mt-1">
                        ₦{Number(businessWallet?.pending_escrow || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-muted/20 border border-border/10 p-4 flex flex-col text-left relative overflow-hidden group">
                      <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Personal Wallet</span>
                      <p className="font-extrabold text-lg text-emerald-500 mt-1">
                        ₦{Number(profile?.wallet_balance || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/20 border border-border/10 p-4 flex flex-col text-left relative overflow-hidden group">
                      <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Coupon Cash</span>
                      <p className="font-extrabold text-lg text-primary mt-1">
                        ₦{Number(profile?.coupon_balance || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>                      {/* Minimalist Wallet Fund Section */}
                  <div className="border-t border-border/10 pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-foreground tracking-tight">Fund Wallet</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Deposit secure funds instantly via GTCO Squad</p>
                      </div>
                      <Badge variant="outline" className="text-[8px] font-bold tracking-wider px-2 py-0.5 bg-emerald-500/5 text-emerald-500 border-emerald-500/20 uppercase">SQUAD SECURE</Badge>
                    </div>

                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-bold text-muted-foreground">₦</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={fundingAmount}
                        onChange={(e) => setFundingAmount(e.target.value)}
                        className="pl-7 pr-24 h-11 rounded-xl bg-muted/20 border-border/20 focus-visible:ring-emerald-500/30 font-bold text-sm"
                      />
                      <Button
                        type="button"
                        onClick={() => handleFundWallet()}
                        disabled={funding || !fundingAmount || Number(fundingAmount) <= 0}
                        className="absolute right-1.5 h-8 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                      >
                        {funding ? "Processing..." : "Deposit"}
                      </Button>
                    </div>
                  </div>

                  {/* Withdrawal Type Selection */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs text-muted-foreground">Withdrawal Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={withdrawalType === "business" ? "default" : "outline"}
                        onClick={() => setWithdrawalType("business")}
                        className="h-9 rounded-xl font-bold text-xs"
                      >
                        Sales Balance
                      </Button>
                      <Button
                        type="button"
                        variant={withdrawalType === "coupon" ? "default" : "outline"}
                        disabled={!withdrawConfig.allow}
                        onClick={() => setWithdrawalType("coupon")}
                        className="h-9 rounded-xl font-bold text-xs"
                      >
                        Coupon Points {!withdrawConfig.allow && "(Locked)"}
                      </Button>
                    </div>
                  </div>

                  {(withdrawalType === "business" || withdrawConfig.allow) && (
                    <form onSubmit={handleWithdrawalRequest} className="space-y-3 pt-2 border-t border-border/10">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Request Squad Bank Payout
                      </h3>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="bankName" className="text-xs text-muted-foreground">Bank Name</Label>
                        <select
                          id="bankName"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background px-3 h-10 text-sm focus:ring-1 focus:ring-primary"
                          required
                        >
                          <option value="">Select your bank</option>
                          <option value="044">Access Bank</option>
                          <option value="050">Ecobank Nigeria</option>
                          <option value="070">Fidelity Bank</option>
                          <option value="011">First Bank of Nigeria</option>
                          <option value="058">GTBank</option>
                          <option value="030">Heritage Bank</option>
                          <option value="301">Jaiz Bank</option>
                          <option value="082">Keystone Bank</option>
                          <option value="999992">OPay Digital Services</option>
                          <option value="999991">PalmPay</option>
                          <option value="076">Polaris Bank</option>
                          <option value="101">Providus Bank</option>
                          <option value="221">Stanbic IBTC Bank</option>
                          <option value="068">Standard Chartered Bank</option>
                          <option value="232">Sterling Bank</option>
                          <option value="100">SunTrust Bank</option>
                          <option value="032">Union Bank of Nigeria</option>
                          <option value="033">United Bank for Africa (UBA)</option>
                          <option value="215">Unity Bank</option>
                          <option value="035">Wema Bank</option>
                          <option value="057">Zenith Bank</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="acctNumber" className="text-xs text-muted-foreground">Account Number</Label>
                          <Input
                            id="acctNumber"
                            maxLength={10}
                            placeholder="10 digit NUBAN"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="acctName" className="text-xs text-muted-foreground">Account Name</Label>
                          <Input
                            id="acctName"
                            placeholder="E.g. John Doe"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="wdAmount" className="text-xs text-muted-foreground">Amount (₦)</Label>
                        <Input
                          id="wdAmount"
                          type="number"
                          placeholder="₦ Amount to withdraw"
                          max={withdrawalType === "coupon" ? (profile?.coupon_balance || 0) : (businessWallet?.available_balance || 0)}
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={
                          withdrawing || 
                          !withdrawAmount || 
                          Number(withdrawAmount) > (withdrawalType === "coupon" ? (profile?.coupon_balance || 0) : (businessWallet?.available_balance || 0))
                        }
                        className="w-full rounded-xl font-semibold mt-2 h-10"
                      >
                        {withdrawing ? (
                          <>
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                            Processing Payout...
                          </>
                        ) : (
                          "Request Bank Transfer"
                        )}
                      </Button>
                    </form>
                  )}

                  {/* Withdrawal History Log */}
                  {withdrawHistory.length > 0 && (
                    <div className="pt-3 border-t border-border/10 space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payout History</h4>
                      <div className="space-y-1.5 max-h-24 overflow-y-auto no-scrollbar">
                        {withdrawHistory.map((w) => (
                          <div key={w.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/20 text-[11px] border border-border/5">
                            <div className="text-left">
                              <p className="font-semibold text-foreground">₦{Number(w.amount).toLocaleString()}</p>
                              <p className="text-[9px] text-muted-foreground">{w.bank_name} • {w.account_number}</p>
                            </div>
                            <span className={cn(
                              "text-[9px] font-bold uppercase py-0.5 px-2 rounded-full",
                              w.status === "completed" ? "bg-green-500/10 text-green-500" :
                              w.status === "processing" ? "bg-amber-500/10 text-amber-500" :
                              w.status === "rejected" ? "bg-red-500/10 text-red-500" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {w.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 6: 🎁 Referral Program */}
          <div className="border border-border/10 rounded-2xl bg-card overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection("referral")}
              className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 transition-colors text-foreground"
            >
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-muted-foreground" />
                <span>🎁 Referral Program</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expandedSection === "referral" && "rotate-180")} />
            </button>
            {expandedSection === "referral" && (
              <div className="p-5 border-t border-border/10 space-y-4">
                {referralCode && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg bg-muted/50 px-4 py-3">
                      <p className="text-xs text-muted-foreground">Your referral code</p>
                      <p className="text-lg font-mono font-semibold text-foreground">{referralCode}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(referralCode);
                        toast({ title: "Copied!", description: "Referral code copied to clipboard" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-semibold text-foreground">{totalReferrals}</p>
                    <p className="text-xs text-muted-foreground">Friends Referred</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <p className="text-2xl font-semibold text-foreground">{totalPoints}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Points Earned</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY 7: 🛡️ Security, Identity & Booster */}
          <div className="border border-border/10 rounded-2xl bg-card overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection("verification")}
              className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 transition-colors text-foreground"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <span>🛡️ Security & KYC Verification</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expandedSection === "verification" && "rotate-180")} />
            </button>
            {expandedSection === "verification" && (
              <div className="p-5 border-t border-border/10 space-y-4">
                {/* Identity Verification Status */}
                <div className="rounded-xl border border-border/20 p-4 space-y-3 bg-muted/5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground uppercase tracking-wider">Identity KYC</span>
                    <span className={cn(
                      "text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border border-border/20 uppercase tracking-widest",
                      (profile?.verification_level || 0) >= 2 ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {(profile?.verification_level || 0) >= 2 ? "Verified" : "Level 1 (Standard)"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Verify your identity using Didit (NIN / Passport) to enable unlimited payout withdrawals and build buyer trust.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/business/verify")}
                    className="w-full h-9 rounded-xl font-bold text-xs"
                  >
                    Start Didit Identity verification
                  </Button>
                </div>

                {/* Premium Booster Status */}
                {businessData && (
                  <div className="rounded-xl border border-border/20 p-4 space-y-3 bg-muted/5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground uppercase tracking-wider">Premium Shop Booster</span>
                      <span className={cn(
                        "text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border border-border/20 uppercase tracking-widest",
                        businessData.verification_tier === "premium" ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/20" : "bg-muted text-muted-foreground"
                      )}>
                        {businessData.verification_tier === "premium" ? "Gold Elite" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Unlock 100% smart match weights, dynamic Discover card showcase, and the Gold Elite stars emblem.
                    </p>
                    <Button
                      variant={businessData.verification_tier === "premium" ? "outline" : "default"}
                      onClick={() => navigate("/business/boost")}
                      className={cn(
                        "w-full h-9 rounded-xl font-bold text-xs",
                        businessData.verification_tier !== "premium" && "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:opacity-95 text-white border-0"
                      )}
                    >
                      {businessData.verification_tier === "premium" ? "Manage Subscription" : "Boost Visibility"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CATEGORY 8: Appearance & Theme Customizer */}
          <div className="border border-border/10 rounded-2xl bg-card overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection("appearance")}
              className="w-full flex items-center justify-between p-4 font-semibold text-sm hover:bg-accent/40 transition-colors text-foreground"
            >
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <span>🎨 Appearance & Theme Customize</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expandedSection === "appearance" && "rotate-180")} />
            </button>
            {expandedSection === "appearance" && (
              <div className="p-5 border-t border-border/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Dark / Light Mode</span>
                  <ThemeToggle />
                </div>
                <div className="pt-2 border-t border-border/5">
                  <p className="text-xs font-semibold text-foreground mb-2.5">Brand Accent Color</p>
                  <ThemeCustomizer />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-3 sm:flex-row pt-4 border-t border-border/10 mt-6">
          {businessData && (
            <Button onClick={handleSave} disabled={saving} className="google-input-button flex-1 sm:flex-initial">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
          <Button variant="outline" onClick={signOut} className="google-input-button">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
