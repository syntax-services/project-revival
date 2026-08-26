import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
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
  ArrowUpRight, ShieldCheck, TrendingUp, Clock,
  AlertTriangle, Store, Eye, Plus
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { StructuredLocationSelection, formatStructuredLocation, getLocationCoords } from "@/hooks/useStructuredLocations";

export default function BusinessOverview() {
  usePageMeta({
    title: "Merchant Dashboard & Sales Hub",
    description: "Monitor your daily store sales, unique view analytics, incoming messages, and live catalog performance.",
    keywords: ["merchant dashboard","store sales","analytics","business overview"],
    });

  const { profile, user, refreshProfile } = useAuth();
  const { data: business, isLoading: businessLoading } = useBusiness();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

      // 1. Call the secure onboarding RPC
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
          latitude: coords.latitude,
          longitude: coords.longitude,
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
          latitude: coords.latitude,
          longitude: coords.longitude,
          location_verified: true,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success(`Merchant Shop "${setupBizName}" successfully initialized!`);
      queryClient.invalidateQueries({ queryKey: ["business"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
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

  const { data: locationRequest } = useQuery({
    queryKey: ["my-location-request", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("location_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isLocationVerified = !!business?.location_verified || locationRequest?.status === "verified" || (profile?.verification_level && profile.verification_level >= 2);
  const isStoreInitialized = !!business || !!locationRequest || !!profile?.onboarding_completed || !!user;

  const isLoading = businessLoading || statsLoading || ordersLoading || jobsLoading;

  // Build Live Activity Stream
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

  // Reputation & Growth metrics
  const reputationScore = business?.reputation_score || 0;
  const verificationTier = business?.verification_tier || "none";

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
      label: "Profile Views", 
      value: business?.views_count || 0, 
      icon: Eye,
      highlight: (business?.views_count || 0) > 0,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24 lg:pb-8 animate-fade-in text-left">

        {/* Uninitialized Store Alert Banner */}
        {!isLoading && !isStoreInitialized && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-1">
              <h3 className="font-bold text-amber-500 text-sm flex items-center gap-1.5">
                <Store className="h-4 w-4" /> Setup Profile & Launch Store
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                Your merchant shop is not initialized yet. Complete your profile details and set up your pickup address in Settings to activate your shop listings, receive orders, and withdraw sales payouts.
              </p>
            </div>
            <Button 
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 font-bold rounded-xl text-xs h-9 cursor-pointer"
              onClick={() => navigate("/business/settings")}
            >
              Complete Setup Now
            </Button>
          </div>
        )}

        {/* Unverified Location Alert Banner */}
        {!isLoading && isStoreInitialized && !isLocationVerified && (
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

        {/* Chat-to-buy giant button */}
        <div className="flex justify-center py-2 mb-4">
          <Button 
            onClick={() => navigate("/business/upload")}
            className="w-full sm:w-auto px-12 py-8 rounded-3xl bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-xl shadow-primary/20 transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 text-lg"
          >
            <Plus className="h-8 w-8" />
            Create Product Listing
          </Button>
        </div>

        {/* 'Pending Orders / Leads' summary list */}
        <div className="grid gap-4 grid-cols-2">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
                <Skeleton className="h-8 w-16 mt-2" />
              </div>
            ))
          ) : (
            <>
              <div
                className="stat-card relative overflow-hidden transition-all duration-300 cursor-pointer active:scale-95 hover:border-primary/20 hover:shadow-lg hover:shadow-black/5 bg-card/50 border border-border/40"
                onClick={() => navigate("/business/orders")}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pending Orders</p>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-2 text-foreground">
                  {stats?.pendingOrders || 0}
                </p>
              </div>
              <div
                className="stat-card relative overflow-hidden transition-all duration-300 cursor-pointer active:scale-95 hover:border-primary/20 hover:shadow-lg hover:shadow-black/5 bg-card/50 border border-border/40"
                onClick={() => navigate("/business/leads")}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Market Leads</p>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-2 text-foreground">
                  {leadsCount}
                </p>
              </div>
            </>
          )}
        </div>

        {leadsCount > 10 && (
          <Accordion type="single" collapsible className="w-full mt-4 bg-card/50 rounded-2xl border border-border/20 px-4">
            <AccordionItem value="advanced-tools" className="border-0">
              <AccordionTrigger className="text-sm font-bold text-foreground hover:no-underline">Advanced Tools</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2 pb-4">
                <div className="grid gap-4 grid-cols-2">
                  <div
                    className="stat-card relative overflow-hidden transition-all duration-300 cursor-pointer active:scale-95 hover:border-primary/20 hover:shadow-lg hover:shadow-black/5 bg-background border border-border/20"
                    onClick={() => navigate("/business/jobs")}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Job Requests</p>
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-bold mt-2 text-foreground">
                      {stats?.pendingJobs || 0}
                    </p>
                  </div>
                  <div
                    className="stat-card relative overflow-hidden transition-all duration-300 bg-background border border-border/20"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Profile Views</p>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-bold mt-2 text-foreground">
                      {business?.views_count || 0}
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={() => navigate("/business/analytics")}
                  className="w-full px-6 py-4 rounded-2xl bg-secondary hover:bg-secondary/90 font-bold transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 text-foreground"
                >
                  <TrendingUp className="h-4 w-4" />
                  View Detailed Analytics
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

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