/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  MapPin, ShoppingBag, Briefcase, Building2,
  Users, DollarSign, Key, MessageSquare, Send,
  Shield, Star, Wallet, Reply, Eye, Image,
  TrendingUp, LogOut, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAllWithdrawals } from "@/hooks/useBusinessEarnings";
import { useAllMessageReplies } from "@/hooks/useAdminMessages";
import { LaunchAnalytics } from "@/components/admin/LaunchAnalytics";
import { InterlockingLoader } from "@/components/ui/interlocking-loader";

// Modular Admin Tab Components
import { AdminUsersTab } from "@/components/admin/tabs/AdminUsersTab";
import { AdminBusinessesTab } from "@/components/admin/tabs/AdminBusinessesTab";
import { AdminOrdersTab } from "@/components/admin/tabs/AdminOrdersTab";
import { AdminJobsTab } from "@/components/admin/tabs/AdminJobsTab";
import { AdminReviewsTab } from "@/components/admin/tabs/AdminReviewsTab";
import { AdminOffersTab } from "@/components/admin/tabs/AdminOffersTab";
import { AdminWithdrawalsTab } from "@/components/admin/tabs/AdminWithdrawalsTab";
import { AdminLocationsTab } from "@/components/admin/tabs/AdminLocationsTab";
import { AdminMessagesTab } from "@/components/admin/tabs/AdminMessagesTab";
import { AdminCommissionTab } from "@/components/admin/tabs/AdminCommissionTab";
import { AdminPlatformTab } from "@/components/admin/tabs/AdminPlatformTab";
import { AdminFeedbacksTab } from "@/components/admin/tabs/AdminFeedbacksTab";
import { AdminReferralsTab } from "@/components/admin/tabs/AdminReferralsTab";
import { AdminBroadcastTab } from "@/components/admin/tabs/AdminBroadcastTab";

export default function StringAdmin() {
  const { signOut, user, refreshProfile, isAdmin, loading: checkingAdminFromAuth } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [bootstrapKey, setBootstrapKey] = useState("");

  // Booster Price Query
  const { data: boosterPrice = 15000 } = useQuery({
    queryKey: ["admin-booster-price"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "booster_monthly_price")
          .maybeSingle();
        if (error || !data) throw new Error("Fallback");
        return Number(data.value);
      } catch {
        const stored = localStorage.getItem("booster_monthly_price");
        return stored ? Number(stored) : 15000;
      }
    }
  });

  // IDIC Global Dashboard control
  const [hideIdicDashboard, setHideIdicDashboard] = useState(false);
  const { data: idicConfig } = useQuery({
    queryKey: ["admin-idic-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "hide_idic_dashboard")
        .maybeSingle();
      if (error || !data) return { value: "false" };
      return data;
    }
  });

  useEffect(() => {
    if (idicConfig) {
      setHideIdicDashboard(idicConfig.value === true || idicConfig.value === "true");
    }
  }, [idicConfig]);

  // Feedbacks Query
  const { data: feedbacks = [], isLoading: loadingFeedbacks, refetch: refetchFeedbacks } = useQuery({
    queryKey: ["admin-feedbacks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_feedbacks")
        .select("*, profiles:user_id (full_name, email, user_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Referral Codes Query
  const { data: referralCodes = [], isLoading: loadingReferralCodes, refetch: refetchReferralCodes } = useQuery({
    queryKey: ["admin-referral-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_codes")
        .select(`
          *,
          profiles:user_id (full_name, email),
          assigned_profiles:assigned_user_id (full_name, email)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fraud Alerts Query
  const { data: fraudAlerts = [], isLoading: loadingFraudAlerts, refetch: refetchFraudAlerts } = useQuery({
    queryKey: ["admin-fraud-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_fraud_alerts")
        .select("*, profiles:user_id (full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Referrals List Query
  const { data: referralsList = [], isLoading: loadingReferrals, refetch: refetchReferrals } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select(`
          *,
          referrers:referrer_id (full_name, email),
          referreds:referred_id (full_name, email)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Activity Logs Query
  const { data: activityLogs, isLoading: loadingActivityLogs, refetch: refetchActivityLogs } = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*, profiles:user_id (full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all profiles
  const { data: profiles = [], isLoading: loadingProfiles, refetch: refetchProfiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all businesses
  const { data: businesses = [], isLoading: loadingBusinesses, refetch: refetchBusinesses } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*, profiles:user_id (email, full_name), business_wallets(available_balance)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all orders
  const { data: orders = [], isLoading: loadingOrders, refetch: refetchOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers:customer_id (profiles:user_id (full_name)), businesses:business_id (company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all jobs
  const { data: jobs = [], isLoading: loadingJobs, refetch: refetchJobs } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customers:customer_id (profiles:user_id (full_name)), businesses:business_id (company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all reviews
  const { data: allReviews = [], isLoading: loadingReviews, refetch: refetchReviews } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, businesses:business_id (company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all offers
  const { data: allOffers = [], refetch: refetchOffers } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch admin sent messages
  const { data: adminMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch replies from users
  const { data: messageReplies = [] } = useAllMessageReplies();

  // Fetch live chat monitor messages
  const { data: liveMessages = [] } = useQuery({
    queryKey: ["admin-live-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          sender_type,
          attachments,
          conversations:conversation_id (
            id,
            customers:customer_id (profiles:user_id (full_name)),
            businesses:business_id (company_name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Fetch all products for commission management
  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, businesses:business_id (company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch system config (terms version, etc.)
  const { data: config, refetch: refetchConfig } = useQuery({
    queryKey: ["admin-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .eq("key", "terms_version")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch customers to determine gender
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("user_id, gender");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch location verification requests
  const { data: locationRequests = [], refetch: refetchLocations } = useQuery({
    queryKey: ["admin-location-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_requests")
        .select("*, profiles:user_id (email, full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: withdrawals = [] } = useAllWithdrawals();

  // Send message dialog state
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [messageRecipientType, setMessageRecipientType] = useState<'all' | 'businesses' | 'customers'>("all");
  const [messagePinned, setMessagePinned] = useState(false);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("admin_messages")
        .insert({
          title: messageTitle,
          content: messageContent,
          recipient_type: messageRecipientType,
          is_pinned: messagePinned,
          sent_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message sent successfully!");
      setShowMessageDialog(false);
      setMessageTitle("");
      setMessageContent("");
      refetchMessages();
    },
    onError: (err: any) => {
      toast.error("Failed to send message: " + err.message);
    }
  });

  // Bootstrap admin mutation
  const bootstrapAdminMutation = useMutation({
    mutationFn: async (key: string) => {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
        body: { secret_key: key }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast.success("Successfully upgraded to Admin! Refreshing permissions... 🛡️");
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setBootstrapKey("");
    },
    onError: (err: any) => {
      toast.error("Failed to claim admin: " + (err.message || "Invalid Key"));
    }
  });

  // Derive location audit datasets
  const pendingLocations = locationRequests.filter((r: any) => r.status === 'pending');
  const allUsersWithLocations = profiles
    .filter((p: any) => p.latitude && p.longitude)
    .map((p: any) => ({
      id: p.id,
      name: p.full_name,
      email: p.email,
      type: p.user_type,
      lat: p.latitude,
      lng: p.longitude,
      verified: p.user_type === 'business'
        ? businesses.find((b: any) => b.user_id === p.id)?.location_verified
        : true
    }));

  if (checkingAdminFromAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <InterlockingLoader size="md" label="Verifying Administrator Credentials..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
              <Shield className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">String Operations Center</h1>
              <p className="text-sm text-muted-foreground">Comprehensive administration and real-time oversight</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/customer/overview")}>
              Back to App
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Claim Admin Key Banner (if not already verified as Admin) */}
        {!isAdmin && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Key className="h-6 w-6 text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold text-sm">Administrator Role Required</p>
                  <p className="text-xs text-muted-foreground">Enter master security bootstrap key to authorize this session.</p>
                </div>
              </div>
              <div className="flex w-full md:w-auto gap-2">
                <Input
                  type="password"
                  placeholder="Master Admin Key"
                  value={bootstrapKey}
                  onChange={(e) => setBootstrapKey(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => bootstrapAdminMutation.mutate(bootstrapKey)}
                  disabled={!bootstrapKey || bootstrapAdminMutation.isPending}
                  className="h-9 text-xs font-bold shrink-0"
                >
                  {bootstrapAdminMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{profiles?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{businesses?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Businesses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{orders?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Briefcase className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{jobs?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{allReviews?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{withdrawals?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Withdrawals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-lg">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Eye className="h-4 w-4" />
          </div>
          <Input
            placeholder="Search users, businesses, orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-card/40 backdrop-blur-md border-border/40 rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="mb-6 w-full max-w-sm">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-card/50 backdrop-blur-md border-border/50 h-12 rounded-xl text-left font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold mr-2">Admin View:</span>
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-[60vh]">
                <SelectGroup>
                  <SelectLabel>Insights & Actions</SelectLabel>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="broadcast">Broadcast</SelectItem>
                  <SelectItem value="messages">Messages</SelectItem>
                  <SelectItem value="feedbacks">Feedbacks</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Accounts & Identity</SelectLabel>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="businesses">Businesses</SelectItem>
                  <SelectItem value="referrals">Referrals</SelectItem>
                  <SelectItem value="locations">Locations</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Marketplace & Economy</SelectLabel>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="jobs">Jobs</SelectItem>
                  <SelectItem value="offers">Offers</SelectItem>
                  <SelectItem value="reviews">Reviews</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Finance & System</SelectLabel>
                  <SelectItem value="withdrawals">Withdrawals</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="platform">Platform Configuration</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="analytics" className="space-y-4">
            <LaunchAnalytics 
              profiles={profiles}
              businesses={businesses}
              orders={orders}
              jobs={jobs}
            />
          </TabsContent>

          <TabsContent value="broadcast" className="space-y-4">
            <AdminBroadcastTab />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <AdminUsersTab
              searchTerm={searchTerm}
              profiles={profiles}
              customers={customers}
              loadingProfiles={loadingProfiles}
              refetchProfiles={refetchProfiles}
            />
          </TabsContent>

          <TabsContent value="businesses" className="space-y-4">
            <AdminBusinessesTab
              searchTerm={searchTerm}
              businesses={businesses}
              loadingBusinesses={loadingBusinesses}
              refetchBusinesses={refetchBusinesses}
            />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <AdminOrdersTab
              orders={orders}
              loadingOrders={loadingOrders}
              refetchOrders={refetchOrders}
            />
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <AdminJobsTab
              jobs={jobs}
              loadingJobs={loadingJobs}
              refetchJobs={refetchJobs}
            />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <AdminReviewsTab
              allReviews={allReviews}
              loadingReviews={loadingReviews}
              refetchReviews={refetchReviews}
            />
          </TabsContent>

          <TabsContent value="offers" className="space-y-4">
            <AdminOffersTab
              allOffers={allOffers}
              refetchOffers={refetchOffers}
            />
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4">
            <AdminWithdrawalsTab />
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <AdminLocationsTab
              pendingLocations={pendingLocations}
              allUsersWithLocations={allUsersWithLocations}
              businesses={businesses}
              refetchLocations={refetchLocations}
              refetchProfiles={refetchProfiles}
            />
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <AdminMessagesTab
              adminMessages={adminMessages}
              messageReplies={messageReplies}
              liveMessages={liveMessages}
              onNewMessage={() => setShowMessageDialog(true)}
              refetchMessages={refetchMessages}
            />
          </TabsContent>

          <TabsContent value="commission" className="space-y-4">
            <AdminCommissionTab
              products={products}
              refetchProducts={refetchProducts}
            />
          </TabsContent>

          <TabsContent value="platform" className="space-y-4">
            <AdminPlatformTab
              config={config}
              profiles={profiles}
              boosterPrice={boosterPrice}
              hideIdicDashboard={hideIdicDashboard}
              setHideIdicDashboard={setHideIdicDashboard}
              activityLogs={activityLogs}
              loadingActivityLogs={loadingActivityLogs}
              refetchActivityLogs={refetchActivityLogs}
              refetchConfig={refetchConfig}
            />
          </TabsContent>

          <TabsContent value="feedbacks" className="space-y-4">
            <AdminFeedbacksTab
              feedbacks={feedbacks}
              loadingFeedbacks={loadingFeedbacks}
              refetchFeedbacks={refetchFeedbacks}
            />
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            <AdminReferralsTab
              referralCodes={referralCodes}
              fraudAlerts={fraudAlerts}
              referralsList={referralsList}
              loadingReferralCodes={loadingReferralCodes}
              loadingFraudAlerts={loadingFraudAlerts}
              loadingReferrals={loadingReferrals}
              refetchReferralCodes={refetchReferralCodes}
              refetchFraudAlerts={refetchFraudAlerts}
              refetchReferrals={refetchReferrals}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Admin Message</DialogTitle>
            <DialogDescription>Send an announcement to platform users</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Message title..."
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Write your message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Recipients</Label>
              <Select
                value={messageRecipientType}
                onValueChange={(v: 'all' | 'businesses' | 'customers') => setMessageRecipientType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="businesses">Businesses Only</SelectItem>
                  <SelectItem value="customers">Customers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={messagePinned} onCheckedChange={setMessagePinned} />
              <Label>Pin this message</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>Cancel</Button>
            <Button
              onClick={() => sendMessageMutation.mutate()}
              disabled={!messageTitle || !messageContent || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
