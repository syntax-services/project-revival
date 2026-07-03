import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useBusiness, 
  useBusinessStats, 
  useBusinessOrders, 
  useBusinessJobs 
} from "@/hooks/useBusiness";
import { 
  MessageSquare, Package, Briefcase, Star, DollarSign, 
  ArrowUpRight, Award, ShieldCheck, CheckCircle2, TrendingUp, Clock, Flame,
  AlertTriangle, Loader2, Store
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { StructuredLocationSelection, formatStructuredLocation, getLocationCoords } from "@/hooks/useStructuredLocations";
import { StructuredLocationPicker } from "@/components/location/StructuredLocationPicker";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BusinessOverview() {
  const { profile, user, refreshProfile } = useAuth();
  const { data: business, isLoading: businessLoading } = useBusiness();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!businessLoading && !business) {
      navigate("/store/complete", { replace: true });
    }
  }, [business, businessLoading, navigate]);

  // Business registration states for onboarding fallback
  const [setupBizName, setSetupBizName] = useState("");
  const [setupBizType, setSetupBizType] = useState<"goods" | "services" | "both">("both");
  const [setupBizLocation, setSetupBizLocation] = useState<StructuredLocationSelection | null>(null);
  const [registeringBusiness, setRegisteringBusiness] = useState(false);

  const handleRegisterBusiness = async () => {
    if (!setupBizName || !setupBizLocation || !profile?.id) return;
    setRegisteringBusiness(true);
    try {
      const formattedLocation = formatStructuredLocation(setupBizLocation);
      const coords = getLocationCoords(setupBizLocation);
      const dbLandmarkId = setupBizLocation.landmark?.id && !setupBizLocation.landmark.id.startsWith("default-")
        ? setupBizLocation.landmark.id
        : null;

      // 1. Call the secure onboarding RPC which bypasses RLS issues
      const { error: rpcError } = await supabase.rpc("complete_onboarding_setup", {
        p_full_name: profile.full_name || "Merchant",
        p_phone: profile.phone || "",
        p_user_type: "business",
        p_business_data: {
          companyName: setupBizName,
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

      if (!user?.id) throw new Error("User session not found");

      // 2. Update the business coordinates
      const { error: updateError } = await supabase
        .from("businesses")
        .update({
          business_location: formattedLocation,
          area_name: setupBizLocation.area.name,
          location_area_id: setupBizLocation.area.id,
          location_street_id: setupBizLocation.street.id,
          location_landmark_id: dbLandmarkId,
          latitude: coords.lat,
          longitude: coords.lng,
          location_verified: true, // Auto-verify onboarding location coordinates
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success(`Merchant Shop "${setupBizName}" successfully initialized! 🚀`);
      queryClient.invalidateQueries({ queryKey: ["business"] });
    } catch (err: any) {
      console.error("Failed to register business:", err);
      toast.error(`Could not register business: ${err.message || err.toString()}`);
    } finally {
      setRegisteringBusiness(false);
    }
  };
  const { data: stats, isLoading: statsLoading } = useBusinessStats(business?.id);
  const { data: orders = [], isLoading: ordersLoading } = useBusinessOrders(business?.id);
  const { data: jobs = [], isLoading: jobsLoading } = useBusinessJobs(business?.id);



  // Fetch open leads count in the platform
  const { data: leadsCount = 0 } = useQuery({
    queryKey: ["open-leads-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("offers")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      if (error) throw error;
      return count || 0;
    }
  });

  const isLoading = businessLoading || statsLoading || ordersLoading || jobsLoading;

  // 1. Calculate Daily Net Revenue for last 7 days
  const revenueData = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toLocaleDateString("en-US", { weekday: "short" });
    const dateStr = date.toISOString().split("T")[0];

    // Daily Orders Net Revenue
    const dayOrdersRevenue = orders
      .filter((o) => o.status === "delivered" && o.created_at.startsWith(dateStr))
      .reduce((sum, o) => sum + (Number(o.total || 0) - Number(o.commission_amount || 0) - Number(o.platform_fee || 0)), 0);

    // Daily Jobs Net Revenue
    const dayJobsRevenue = jobs
      .filter((j) => j.status === "completed" && j.created_at.startsWith(dateStr))
      .reduce((sum, j) => sum + (Number(j.final_price || 0) * 0.9), 0);

    return {
      day: dateString,
      revenue: Math.round(dayOrdersRevenue + dayJobsRevenue),
    };
  }).reverse();

  // 2. Build Live Activity Stream
  const activityStream = [
    ...orders.map((o) => ({
      id: o.id,
      type: "order",
      title: `Order Received`,
      description: `Order #${o.id.slice(0, 8)} • ₦${Number(o.total || 0).toLocaleString()}`,
      status: o.status,
      date: new Date(o.created_at),
    })),
    ...jobs.map((j) => ({
      id: j.id,
      type: "job",
      title: `Job ${j.status === "completed" ? "Completed" : "Requested"}`,
      description: j.services?.name || "Job Service Request",
      status: j.status,
      date: new Date(j.created_at),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())
   .slice(0, 4);

  // 3. Reputation & Growth center metrics
  const reputationScore = business?.reputation_score || 0;
  const verificationTier = business?.verification_tier || "none";
  const completedTotal = (stats?.completedOrders || 0) + (stats?.completedJobs || 0);
  const nextTarget = 10;
  const progressPercent = Math.min((completedTotal / nextTarget) * 100, 100);

  let repTier = "New Partner";
  if (reputationScore >= 4.5) repTier = "Elite Top Trader 🌟";
  else if (reputationScore >= 4.0) repTier = "Highly Recommended 👍";
  else if (reputationScore > 0) repTier = "Rising Star 🚀";

  const statCards = [
    { 
      label: "Pending Orders", 
      value: stats?.pendingOrders || 0, 
      icon: Package, 
      onClick: () => navigate("/business/orders"),
      highlight: (stats?.pendingOrders || 0) > 0,
    },
    { 
      label: "Job Requests", 
      value: stats?.pendingJobs || 0, 
      icon: Briefcase,
      onClick: () => navigate("/business/jobs"),
      highlight: (stats?.pendingJobs || 0) > 0,
    },
    { 
      label: "Market Leads", 
      value: leadsCount, 
      icon: ArrowUpRight,
      onClick: () => navigate("/business/leads"),
      highlight: leadsCount > 0,
    },
    { 
      label: "Net Earnings", 
      value: `₦${(stats?.totalRevenue || 0).toLocaleString()}`, 
      icon: DollarSign,
    },
  ];

  if (!businessLoading && !business) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto space-y-6 pb-24 lg:pb-8 animate-fade-in mt-6 text-left">
          <Card className="border border-border/40 bg-background/40 backdrop-blur-xl shadow-xl p-6 sm:p-8 rounded-3xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 animate-pulse">
                <Store className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Initialize Merchant Studio Node</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Provision a secondary merchant profile under this login. Switch back and forth anytime!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="setup-biz-name" className="text-xs font-semibold">Business Shop Name *</Label>
                <Input
                  id="setup-biz-name"
                  value={setupBizName}
                  onChange={(e) => setSetupBizName(e.target.value)}
                  placeholder="e.g. Campus Corner Cafe"
                  className="rounded-xl mt-1"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Business Type *</Label>
                <Select value={setupBizType} onValueChange={(val: any) => setSetupBizType(val)}>
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="goods">🏪 Goods (Food, drinks, accessories, etc.)</SelectItem>
                    <SelectItem value="services">🛠️ Services (Styling, Tutoring, coding, etc.)</SelectItem>
                    <SelectItem value="both">💼 Both Goods & Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <StructuredLocationPicker
                  label="Store pickup / delivery point *"
                  value={setupBizLocation}
                  onChange={setSetupBizLocation}
                  compact
                />
              </div>

              <Button
                onClick={handleRegisterBusiness}
                disabled={registeringBusiness || !setupBizName || !setupBizLocation}
                className="w-full mt-4 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
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
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24 lg:pb-8 animate-fade-in">

        {/* Unverified Location Alert Banner */}
        {!isLoading && business && !business.location_verified && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-1">
              <h3 className="font-bold text-amber-500 text-sm flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Location Verification Required
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                Your store coordinates are not verified. Verification allows our system to map your precise location and calculate exact zone-to-zone delivery rates to OOU campus landmarks.
              </p>
            </div>
            <Button 
              size="sm"
              variant="outline"
              className="border-amber-500/30 hover:bg-amber-500/10 text-amber-500 hover:text-amber-500 shrink-0 font-bold rounded-xl text-xs h-9 cursor-pointer"
              onClick={() => navigate("/business/settings")}
            >
              Verify Location Now
            </Button>
          </div>
        )}
        
        {/* Glowing Welcoming Hero Block */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-background/40 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/5">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl" />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              {business?.logo_url ? (
                <img 
                  src={business.logo_url} 
                  alt={business.company_name} 
                  className="h-16 w-16 rounded-2xl object-cover border border-border/60 shadow-md shadow-black/5 shrink-0" 
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold shrink-0">
                  {business?.company_name?.charAt(0) || "B"}
                </div>
              )}
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
                  {business?.company_name || "Welcome back"}
                  {verificationTier !== "none" && (
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Logged in as <span className="font-semibold text-foreground/80">{profile?.full_name?.split(" ")[0]}</span> • 
                  {business?.industry ? ` ${business.industry}` : " Business Operator"}
                </p>
              </div>
            </div>

            {/* Quick overview badges */}
            <div className="flex gap-2 shrink-0">
              <div className="rounded-2xl border border-border/40 bg-card/40 px-4 py-2.5 text-center shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-[9px]">Reputation</p>
                <p className="text-base font-bold text-foreground flex items-center justify-center gap-1 mt-0.5">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {reputationScore > 0 ? reputationScore.toFixed(1) : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card/40 px-4 py-2.5 text-center shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-[9px]">Status</p>
                <p className="text-xs font-bold text-primary mt-1.5 capitalize">
                  {verificationTier === "premium" ? "Gold Elite" : verificationTier === "verified" ? "Verified" : "Standard"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
                <Skeleton className="h-8 w-16 mt-2" />
              </div>
            ))
          ) : (
            statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`stat-card relative overflow-hidden transition-all duration-300 ${stat.onClick ? "cursor-pointer active:scale-95 hover:border-primary/20 hover:shadow-lg hover:shadow-black/5" : ""} ${stat.highlight ? "border-primary/30 bg-primary/[0.02]" : "bg-card/50"}`}
                  onClick={stat.onClick}
                >
                  {stat.highlight && (
                    <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-primary m-3 animate-ping" />
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                    <Icon className={`h-4 w-4 ${stat.highlight ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold mt-2 text-foreground">
                    {stat.value}
                  </p>
                  {stat.highlight && stat.onClick && (
                    <p className="text-[10px] font-bold text-primary mt-1">Tap to review</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* View Detailed Analytics Button */}
        <div className="flex justify-center py-2">
          <Button 
            onClick={() => navigate("/business/analytics")}
            className="w-full sm:w-auto px-8 py-6 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2"
          >
            <TrendingUp className="h-5 w-5" />
            View Detailed Analytics
          </Button>
        </div>

        {/* Bottom Grid: Live Activity Stream & Actions/Info */}
        <div className="grid gap-4 sm:grid-cols-2">
          
          {/* Live Chronological Activity Stream */}
          <div className="dashboard-card space-y-4">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Operations Stream</h3>
              <p className="text-xs text-muted-foreground">Live chronological feed of customer interactions</p>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : activityStream.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground border border-dashed border-border/40 rounded-2xl bg-muted/5 flex flex-col items-center justify-center">
                <Clock className="h-7 w-7 text-muted-foreground/40 mb-1" />
                <p className="text-xs font-semibold">No operational updates yet</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {activityStream.map((act, index) => {
                  const isOrder = act.type === "order";
                  const Icon = isOrder ? Package : Briefcase;
                  return (
                    <div key={index} className="flex items-center justify-between gap-3 text-xs border-b border-border/20 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground">{act.title}</p>
                          <p className="text-muted-foreground truncate">{act.description}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {formatDistanceToNow(act.date, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="dashboard-card flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Quick Navigation</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => navigate("/business/products")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm flex items-center justify-between group"
                >
                  <span className="flex items-center">
                    <Package className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
                    Manage Products
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => navigate("/business/services")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm flex items-center justify-between group"
                >
                  <span className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
                    Manage Services
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => navigate("/business/leads")}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-primary/5 transition-colors text-sm flex items-center justify-between group text-primary font-bold"
                >
                  <span className="flex items-center">
                    <ArrowUpRight className="h-4 w-4 mr-2 animate-pulse text-primary" />
                    Browse Active Leads
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <button 
                  onClick={() => navigate("/business/messages")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm flex items-center justify-between group"
                >
                  <span className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
                    View Messages
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>

            {!isLoading && business && (
              <div className="border-t border-border/20 pt-4 mt-4 text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Merchant Type</span>
                  <span className="font-semibold text-foreground capitalize">{business.business_type || "Goods"}</span>
                </div>
                <div className="flex justify-between">
                  <span>GPS Tracking</span>
                  <span className="font-semibold text-foreground">{business.location_verified ? "Active & Pinned" : "Inactive"}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}