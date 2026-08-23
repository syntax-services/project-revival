import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { optimizeImage } from "@/lib/imageOptimizer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomer } from "@/hooks/useCustomer";
import { useQuery } from "@tanstack/react-query";
import { useReferral } from "@/hooks/useReferral";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  PremiumBriefcase,
  PremiumStar,
  PremiumPackage,
  PremiumSettings,
  PremiumSupport,
  PremiumHeart,
} from "@/components/ui/custom-icons";
import {
  MapPin,
  ChevronRight,
  LogOut,
  Sparkles,
  Loader2,
  Shield,
  ShieldCheck,
  Trophy,
  Wallet,
  Store,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Modular profile sub-components
import { CustomerIdentityVerification } from "@/components/customer/profile/CustomerIdentityVerification";
import { CustomerIdicSection } from "@/components/customer/profile/CustomerIdicSection";
import { CustomerWalletSection } from "@/components/customer/profile/CustomerWalletSection";
import { CustomerFeedbackModal } from "@/components/customer/profile/CustomerFeedbackModal";
import { CustomerRegisterBusinessModal } from "@/components/customer/profile/CustomerRegisterBusinessModal";
import { AdminModeIcon, MerchantModeIcon } from "@/components/layout/UserRoleSwitcher";

export default function CustomerProfile() {
  const { profile, signOut, refreshProfile, isAdmin, hasBothRoles, switchRole } = useAuth();
  const navigate = useNavigate();
  const { data: customer } = useCustomer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Dialog & tab states
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [showAdvancedPrefs, setShowAdvancedPrefs] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'dashboard' | 'wallet'>('dashboard');

  // Wallet & Gamification States
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);
  const [giftClaimed, setGiftClaimed] = useState(false);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [monthlySpent, setMonthlySpent] = useState<number>(0);
  const [hideIdic, setHideIdic] = useState(false);

  const { referralCode: dbReferralCode, totalPoints: dbPoints } = useReferral();
  const totalPoints = (dbPoints || 0) + Number(profile?.coupon_balance || 0);
  const referralCode = dbReferralCode || profile?.referral_code || null;

  // IDIC tournament global toggle check
  useEffect(() => {
    const fetchIdicToggle = async () => {
      try {
        const { data } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "hide_idic_dashboard")
          .maybeSingle();
        if (data && (data.value === true || data.value === "true")) {
          setHideIdic(true);
        }
      } catch (err) {
        console.warn("Error loading IDIC configuration:", err);
      }
    };
    fetchIdicToggle();
  }, []);

  // Fetch purchase totals for VIP & spend bridge
  useEffect(() => {
    const fetchSpendHistory = async () => {
      if (!customer?.id) return;
      try {
        const { data: userOrders } = await supabase
          .from("orders")
          .select("total_price, created_at, delivery_status")
          .eq("customer_id", customer.id)
          .eq("delivery_status", "delivered");

        if (userOrders) {
          const total = userOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
          setTotalSpent(total);

          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const currentMonthOrders = userOrders.filter(o => new Date(o.created_at) >= startOfMonth);
          const monthly = currentMonthOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
          setMonthlySpent(monthly);
        }

        const { data: wds } = await supabase
          .from("withdrawal_requests")
          .select("*")
          .eq("user_id", profile?.user_id)
          .order("created_at", { ascending: false });
        if (wds) setWithdrawHistory(wds);
      } catch (err) {
        console.warn("Failed to load spend history:", err);
      }
    };
    fetchSpendHistory();
  }, [customer?.id, profile?.user_id]);

  // Fetch stats for dashboard badges
  const { data: stats } = useQuery({
    queryKey: ["customer-stats", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;

      const [ordersRes, jobsRes, reviewsRes, savedRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", customer.id)
          .neq("status", "cancelled")
          .neq("status", "refunded"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("customer_id", customer.id),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("reviewer_id", customer.id),
        supabase.from("saved_businesses").select("id", { count: "exact", head: true }).eq("customer_id", customer.id),
      ]);

      return {
        orders: ordersRes.count || 0,
        jobs: jobsRes.count || 0,
        reviews: reviewsRes.count || 0,
        saved: savedRes.count || 0,
      };
    },
    enabled: !!customer?.id,
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.user_id) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar images must be less than 5MB.");
      return;
    }

    setUploading(true);
    try {
      const optimizedFile = await optimizeImage(file);
      const fileExt = optimizedFile.name.split(".").pop();
      const fileName = `${profile.user_id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("business-images")
        .upload(fileName, optimizedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("business-images").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", profile.user_id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error("Avatar upload failed:", error);
      toast.error("We could not save your profile picture. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const mainMenuList = [
    { icon: PremiumPackage, label: "My Orders", href: "/customer/orders", count: stats?.orders },
    { icon: PremiumBriefcase, label: "My Jobs", href: "/customer/jobs", count: stats?.jobs },
    { icon: PremiumHeart, label: "Saved", href: "/customer/saved", count: stats?.saved },
    { icon: PremiumStar, label: "My Reviews", href: "/customer/engagement", count: stats?.reviews },
  ];

  const secondaryMenuList = [
    { icon: PremiumSettings, label: "Account Settings", href: "/customer/settings" },
    { icon: PremiumSupport, label: "Help & Support", href: "/contact" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-5 pb-10">
        {/* Profile Header Block */}
        <div className="flex flex-col items-center text-center mt-6 space-y-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary to-primary/80 opacity-40 group-hover:opacity-70 transition duration-500" />
            <div className="relative h-32 w-32 rounded-full border-4 border-background bg-card flex items-center justify-center overflow-hidden shadow-2xl">
              {uploading ? (
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground">Uploading...</span>
                </div>
              ) : profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <img
                  src={
                    customer?.gender === 'male'
                      ? '/avatar_male.png'
                      : customer?.gender === 'female'
                        ? '/avatar_female.png'
                        : '/avatar_neutral.png'
                  }
                  alt="Default 3D Avatar"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider">Change Photo</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-medium tracking-tight text-foreground flex items-center justify-center gap-1.5">
              {profile?.full_name || "User Profile"}
              {customer?.location_verified && (
                <Badge variant="default" className="bg-primary hover:bg-primary px-1.5 py-0.5 rounded-full scale-90">
                  <MapPin className="h-3 w-3 mr-0.5" />
                  Verified
                </Badge>
              )}
            </h2>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              {profile?.user_type || "Customer"}
            </p>
            {profile?.idic_code && (
              <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 shadow-sm">
                <Trophy className="h-3 w-3 mr-0.5" />
                IDIC: {profile.idic_department}
              </div>
            )}
          </div>

        </div>

        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* IDIC Tournament Registration Card */}
            {!hideIdic && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-5 shadow-lg shadow-indigo-500/5">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield className="h-24 w-24 text-indigo-500" />
                </div>
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Swords className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Campus Competition</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">IDIC Inter-Department Tournament</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[250px] leading-relaxed">
                      Register your department for the upcoming tournament and compete for campus glory!
                    </p>
                  </div>
                  <Link
                    to="/customer/idic-registration"
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-indigo-500 text-white px-4 text-xs font-bold shadow-md shadow-indigo-500/20 hover:bg-indigo-600 active:scale-95 transition-all w-full max-w-[200px]"
                  >
                    Register Now
                  </Link>
                </div>
              </div>
            )}

            {/* Menu Grid */}
            <div className="bg-card rounded-3xl border border-border/40 overflow-hidden shadow-xl shadow-black/5">
              <div className="grid grid-cols-2 divide-x divide-border/30 border-b border-border/30">
                {mainMenuList.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.href}
                    className="flex flex-col items-center justify-center p-6 gap-2 hover:bg-primary/[0.02] active:bg-primary/[0.04] transition-all duration-200 group"
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-2xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
                        <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      {item.count ? (
                        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-primary flex items-center justify-center px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-background">
                          {item.count}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors tracking-wide">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="divide-y divide-border/30">
                {isAdmin && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-500/[0.02] active:bg-red-500/[0.04] transition-all duration-200 group text-left bg-gradient-to-r from-red-500/[0.03] to-amber-500/[0.03]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <AdminModeIcon className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-semibold text-red-500 text-[13px]">Admin Panel</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-red-500/70 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
                {hasBothRoles && (
                  <button
                    onClick={async () => {
                      await switchRole("business");
                      toast.success("Switched to Merchant View!");
                      navigate("/business");
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/[0.02] active:bg-primary/[0.04] transition-all duration-200 group text-left bg-gradient-to-r from-primary/[0.03] to-primary/[0.01]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                        <MerchantModeIcon className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-semibold text-primary text-[13px]">Merchant Studio</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-primary/70 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}

                {secondaryMenuList.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.href}
                    className="flex items-center justify-between px-4 py-3 hover:bg-primary/[0.02] active:bg-primary/[0.04] transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200">
                        <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="font-medium text-foreground/80 group-hover:text-foreground text-[13px]">{item.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}

                {/* Platform Feedback */}
                <button
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/[0.02] active:bg-primary/[0.04] transition-all duration-200 group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200">
                      <PremiumStar className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="font-medium text-foreground/80 group-hover:text-foreground text-[13px]">Submit Platform Feedback</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Log Out */}
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-destructive/[0.02] active:bg-destructive/[0.04] transition-all duration-200 group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-destructive/10 transition-all duration-200">
                      <LogOut className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
                    </div>
                    <span className="font-medium text-foreground/80 group-hover:text-destructive text-[13px]">Log Out</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

        {/* Hidden Business Registration Accordion */}
        {!hasBothRoles && (
          <div className="bg-card rounded-2xl border border-border/40 overflow-hidden shadow-xl shadow-black/5">
            <button
              onClick={() => setShowAdvancedPrefs(!showAdvancedPrefs)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-all duration-300 text-left"
            >
              <div className="flex items-center gap-3">
                <PremiumBriefcase className="h-4 w-4 text-muted-foreground animate-pulse" />
                <span className="font-semibold text-foreground/80 text-[11px] uppercase tracking-wider">String Merchant Partnership</span>
              </div>
              <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", showAdvancedPrefs && "rotate-90")} />
            </button>
            
            {showAdvancedPrefs && (
              <div className="p-4 bg-muted/20 border-t border-border/30 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300 text-left">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ready to scale your business on String? Set up your merchant profile to showcase products, list premium services, secure transactions via escrow safety, and match instantly with buyers right around your campus region.
                </p>
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold text-xs tracking-wider uppercase hover:opacity-90 active:scale-95 transition-all duration-300 shadow-md shadow-primary/20 flex items-center justify-center gap-1.5"
                >
                  <Store className="h-4 w-4" />
                  Become a String Partner
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feedback Dialog */}
        <CustomerFeedbackModal
          isOpen={isFeedbackModalOpen}
          onOpenChange={setIsFeedbackModalOpen}
          userId={profile?.user_id}
        />

        {/* Business Onboarding Dialog */}
        <CustomerRegisterBusinessModal
          isOpen={isRegisterModalOpen}
          onOpenChange={setIsRegisterModalOpen}
          userId={profile?.user_id}
          refreshProfile={refreshProfile}
          switchRole={switchRole}
        />

        {/* Footer info */}
        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest opacity-80 mt-4">
          Joined {profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : "—"}
        </p>
      </div>
    </DashboardLayout>
  );
}
