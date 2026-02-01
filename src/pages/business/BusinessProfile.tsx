import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness, useBusinessProducts, useBusinessServices } from "@/hooks/useBusiness";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { VerificationBadge } from "@/components/business/VerificationBadge";
import { BusinessEarningsCard } from "@/components/business/BusinessEarningsCard";
import {
  Building2,
  Settings,
  Package,
  Wrench,
  Star,
  ClipboardList,
  BarChart3,
  MapPin,
  ChevronRight,
  LogOut,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";

export default function BusinessProfile() {
  const { profile, signOut } = useAuth();
  const { data: business } = useBusiness();
  const { data: products = [] } = useBusinessProducts(business?.id);
  const { data: services = [] } = useBusinessServices(business?.id);

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["business-stats", business?.id],
    queryFn: async () => {
      if (!business?.id) return null;

      const [ordersRes, jobsRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("business_id", business.id),
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

  const menuItems = [
    { icon: ClipboardList, label: "Orders", href: "/business/orders", count: stats?.orders },
    { icon: Package, label: "Products", href: "/business/products", count: products.length },
    { icon: Wrench, label: "Services", href: "/business/services", count: services.length },
    { icon: Star, label: "Reviews", href: "/business/reviews", count: stats?.reviews },
    { icon: BarChart3, label: "Analytics", href: "/business/analytics" },
    { icon: Settings, label: "Settings", href: "/business/settings" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {business?.cover_image_url ? (
                  <img
                    src={business.cover_image_url}
                    alt={business.company_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold truncate">{business?.company_name}</h2>
                  <VerificationBadge 
                    tier={(business?.verification_tier as "none" | "verified" | "premium") || "none"} 
                    size="sm"
                  />
                </div>
                <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
                {business?.location_verified && (
                  <Badge variant="secondary" className="mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    Location Verified
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{stats?.orders || 0}</p>
              <p className="text-xs text-muted-foreground">Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{stats?.jobs || 0}</p>
              <p className="text-xs text-muted-foreground">Jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{business?.reputation_score?.toFixed(1) || "—"}</p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Card */}
        {business && <BusinessEarningsCard businessId={business.id} />}

        {/* Menu Items */}
        <Card>
          <CardContent className="p-0">
            {menuItems.map((item, idx) => (
              <Link
                key={item.href + item.label}
                to={item.href}
                className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                  idx !== menuItems.length - 1 ? "border-b" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.count !== undefined && (
                    <Badge variant="secondary">{item.count}</Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Theme Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Theme</span>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Member since {profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy") : "—"}
        </p>
      </div>
    </DashboardLayout>
  );
}