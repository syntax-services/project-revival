import { useState, useRef } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { optimizeImage } from "@/lib/imageOptimizer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness, useBusinessProducts, useBusinessServices } from "@/hooks/useBusiness";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/business/VerificationBadge";
import { BusinessEarningsCard } from "@/components/business/BusinessEarningsCard";
import { AdminModeIcon } from "@/components/layout/UserRoleSwitcher";
import {
  PremiumClipboard,
  PremiumPackage,
  PremiumWrench,
  PremiumStar,
  PremiumChart,
  PremiumSettings,
} from "@/components/ui/custom-icons";
import {
  Building2,
  MapPin,
  ChevronRight,
  LogOut,
  Wallet,
  Loader2,
  ArrowUpRight,
  ShieldCheck,
  Crown,
} from "lucide-react";
import { format } from "date-fns";

export default function BusinessProfile() {
  usePageMeta({
    title: "Storefront Profile & Branding Settings",
    description: "Customize your business name, cover banner, logo, campus location, and store description.",
    keywords: ["storefront profile","branding","store settings"],
    });

  const { profile, signOut, refreshProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: business } = useBusiness();

  const handleSwitchToAdmin = async () => {
    if (profile?.user_id) {
      localStorage.setItem(`string_active_admin_mode_${profile.user_id}`, "true");
    }
    await refreshProfile();
    toast.success("Switched to Admin Mode! ");
    navigate("/admin");
  };
  const { data: products = [] } = useBusinessProducts(business?.id);
  const { data: services = [] } = useBusinessServices(business?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["business-stats", business?.id],
    queryFn: async () => {
      if (!business?.id) return null;

      const [ordersRes, jobsRes, reviewsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("business_id", business.id)
          .neq("status", "cancelled")
          .neq("status", "refunded"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("business_id", business.id),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("business_id", business.id),
      ]);

      return {
        orders: ordersRes.count || 0,
        jobs: jobsRes.count || 0,
        reviews: reviewsRes.count || 0,
      };
    },
    enabled: !!business?.id,
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

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

      // Update both profiles and business logo/cover
      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", profile.user_id);

      if (updateProfileError) throw updateProfileError;

      if (business?.id) {
        const { error: updateBizError } = await supabase
          .from("businesses")
          .update({ logo_url: publicUrl, cover_image_url: publicUrl })
          .eq("id", business.id);
        if (updateBizError) throw updateBizError;
      }

      await refreshProfile();
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error("Avatar upload failed:", error);
      toast.error("We could not save your profile picture. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const menuItems = [
    { icon: PremiumClipboard, label: "Orders", href: "/business/orders", count: stats?.orders },
    { icon: PremiumPackage, label: "Products", href: "/business/products", count: products.length },
    { icon: PremiumWrench, label: "Services", href: "/business/services", count: services.length },
    { icon: ArrowUpRight, label: "Leads & Requests", href: "/business/leads" },
    { 
      icon: ShieldCheck, 
      label: business?.location_verified ? "Verified Merchant" : "Get Verified (Free)", 
      href: "/business/verify",
      badge: business?.location_verified ? "active" : "verify"
    },
    { 
      icon: Crown, 
      label: business?.verification_tier === 'premium' ? "Booster Active" : "Boost Visibility (Paid)", 
      href: "/business/boost",
      badge: business?.verification_tier === 'premium' ? "boosted" : "boost"
    },
    { icon: PremiumStar, label: "Reviews", href: "/business/reviews", count: stats?.reviews },
    { icon: PremiumChart, label: "Analytics", href: "/business/analytics" },
    { icon: PremiumSettings, label: "Settings", href: "/business/settings" },
  ];

  const avatarUrl = business?.logo_url || business?.cover_image_url || profile?.avatar_url;

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-5 pb-10">
        
        {/* Profile Header Block */}
        <div className="flex flex-col items-center text-center mt-6 space-y-4">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary to-primary/80 opacity-70 blur-md group-hover:opacity-100 transition duration-500" />
            <div className="relative h-32 w-32 rounded-full border-4 border-background bg-card flex items-center justify-center overflow-hidden shadow-2xl">
              {uploading ? (
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground">Uploading...</span>
                </div>
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={business?.company_name || profile?.full_name || "Business Profile"}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="bg-primary/5 h-full w-full flex items-center justify-center">
                  <Building2 className="h-16 w-16 text-primary" />
                </div>
              )}
              {/* Camera icon hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white flex-col gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
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
              {business?.company_name || profile?.full_name || "Business Profile"}
              <VerificationBadge 
                tier={(business?.verification_tier as "none" | "verified" | "premium") || "none"} 
                size="sm"
              />
            </h2>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              {profile?.email}
            </p>
            {business?.location_verified && (
              <div className="flex justify-center pt-1">
                <Badge variant="secondary" className="px-2 py-0.5 rounded-full scale-90">
                  <MapPin className="h-3 w-3 mr-1" />
                  Location Verified
                </Badge>
              </div>
            )}
          </div>
        </div>
 
        {/* Stats Grid Container */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border border-border/40 p-3 text-center shadow-sm">
            <p className="text-base font-medium text-foreground">{stats?.orders || 0}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Orders</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/40 p-3 text-center shadow-sm">
            <p className="text-base font-medium text-foreground">{stats?.jobs || 0}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Jobs</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/40 p-3 text-center shadow-sm">
            <p className="text-base font-medium text-foreground">{business?.reputation_score?.toFixed(1) || "—"}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Rating</p>
          </div>
        </div>
 
        {/* Earnings Card */}
        {business && <BusinessEarningsCard businessId={business.id} />}
 
        {/* Floating Card Container 1 (Main Menu) */}
        <div className="bg-card rounded-2xl border border-border/40 shadow-xl shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-black/10">
          <div className="divide-y divide-border/30">
            {isAdmin && (
              <button
                onClick={handleSwitchToAdmin}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-red-500/[0.02] active:bg-red-500/[0.04] transition-all duration-300 group text-left bg-gradient-to-r from-red-500/[0.03] to-amber-500/[0.03] border-b border-border/20"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <AdminModeIcon className="h-4.5 w-4.5" />
                  </div>
                  <span className="font-semibold text-red-500 text-[13px] tracking-wide">Admin Panel</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-red-500/70 group-hover:translate-x-0.5 transition-transform duration-300" />
              </button>
            )}
            {menuItems.map((item, idx) => (
              <Link
                key={item.label}
                to={item.href}
                viewTransition
                className="flex items-center justify-between px-4 py-2.5 hover:bg-primary/[0.02] active:bg-primary/[0.04] transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                    <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <span className="font-medium text-foreground/80 group-hover:text-foreground text-[13px] tracking-wide transition-colors duration-300">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge === "active" && (
                    <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider scale-90">
                      Verified
                    </span>
                  )}
                  {item.badge === "verify" && (
                    <span className="bg-primary/10 text-primary text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-wider scale-90">
                      Free
                    </span>
                  )}
                  {item.badge === "boosted" && (
                    <span className="bg-orange-500/10 text-orange-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-orange-500/20 uppercase tracking-wider scale-90">
                      Active
                    </span>
                  )}
                  {item.badge === "boost" && (
                    <span className="bg-gradient-to-r from-yellow-500/15 via-orange-500/15 to-red-500/15 text-orange-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-orange-500/20 uppercase tracking-wider scale-90">
                      Boost
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.25 rounded-full">
                      {item.count}
                    </span>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform duration-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Logout Action */}
        <Button
          variant="outline"
          className="w-full rounded-xl h-10 border-border/40 hover:bg-destructive/5 hover:text-destructive transition-all duration-300 text-sm font-medium tracking-wide active:scale-95"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>

        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest opacity-80">
          Joined {profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : "—"}
        </p>
      </div>
    </DashboardLayout>
  );
}