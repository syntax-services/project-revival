import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  MapPin, ShoppingBag, Briefcase, CheckCircle, XCircle, 
  Clock, Building2, User, Loader2, Users,
  DollarSign, Settings, Key, MessageSquare, Send, Pin,
  Crown, Shield, Trash2, PackageCheck, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type VerificationTier = 'none' | 'verified' | 'premium';

export default function StringAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [bootstrapKey, setBootstrapKey] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Message dialog state
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [messageRecipientType, setMessageRecipientType] = useState<'all' | 'businesses' | 'customers'>('all');
  const [messagePinned, setMessagePinned] = useState(false);

  // Check if user has admin role
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["admin-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Bootstrap admin mutation
  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
        body: { secret_key: bootstrapKey, user_id: user?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Admin role granted! Refreshing...");
      queryClient.invalidateQueries({ queryKey: ["admin-check"] });
      setBootstrapKey("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to bootstrap admin");
    },
  });

  // Fetch all profiles (users)
  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch all customers
  const { data: customers } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, profiles:user_id (full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch location requests
  const { data: locationRequests, isLoading: loadingLocations } = useQuery({
    queryKey: ["admin-location-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_requests")
        .select("*, profiles:user_id (full_name, email, user_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch all businesses
  const { data: businesses, isLoading: loadingBusinesses } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*, profiles:user_id (full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch all products
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, businesses:business_id (company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch orders
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, businesses:business_id (company_name), customers:customer_id (id, user_id, profiles:user_id (full_name, email))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch jobs
  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, businesses:business_id (company_name), customers:customer_id (id, user_id, profiles:user_id (full_name))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch admin messages
  const { data: adminMessages, isLoading: loadingMessages } = useQuery({
    queryKey: ["admin-messages-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Verify location mutation
  const verifyLocationMutation = useMutation({
    mutationFn: async ({ 
      requestId, userId, userType, latitude, longitude, approved
    }: { 
      requestId: string; userId: string; userType: string;
      latitude?: number; longitude?: number; approved: boolean;
    }) => {
      const { error: requestError } = await supabase
        .from("location_requests")
        .update({
          status: approved ? "verified" : "rejected",
          verified_latitude: latitude,
          verified_longitude: longitude,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      if (approved && latitude && longitude) {
        const table = userType === "business" ? "businesses" : "customers";
        const { error: updateError } = await supabase
          .from(table)
          .update({
            latitude, longitude,
            location_verified: true,
            location_verified_at: new Date().toISOString(),
            location_verified_by: user?.id,
          })
          .eq("user_id", userId);
        if (updateError) throw updateError;

        await supabase.from("profiles").update({ latitude, longitude }).eq("user_id", userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-location-requests"] });
      toast.success("Location request processed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to process request");
    },
  });

  // Update product commission
  const updateCommissionMutation = useMutation({
    mutationFn: async ({ productId, commission, isRare }: { productId: string; commission: number; isRare: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ commission_percent: commission, is_rare: isRare })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Commission updated");
    },
    onError: () => toast.error("Failed to update commission"),
  });

  // Update business verification tier
  const updateVerificationTierMutation = useMutation({
    mutationFn: async ({ businessId, tier }: { businessId: string; tier: VerificationTier }) => {
      const { error } = await supabase
        .from("businesses")
        .update({ 
          verification_tier: tier,
          verified: tier !== 'none'
        })
        .eq("id", businessId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Verification tier updated");
    },
    onError: () => toast.error("Failed to update tier"),
  });

  // Confirm delivery on behalf of customer (admin power)
  const confirmDeliveryMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Delivery confirmed by admin");
    },
    onError: () => toast.error("Failed to confirm delivery"),
  });

  // Complete job on behalf of customer (admin power)
  const completeJobMutation = useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      const { error } = await supabase
        .from("jobs")
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      toast.success("Job completed by admin");
    },
    onError: () => toast.error("Failed to complete job"),
  });

  // Send admin message
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admin_messages").insert({
        sender_id: user!.id,
        recipient_type: messageRecipientType,
        title: messageTitle,
        content: messageContent,
        is_pinned: messagePinned,
        read_by: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages-list"] });
      toast.success("Message sent successfully");
      setShowMessageDialog(false);
      setMessageTitle("");
      setMessageContent("");
      setMessagePinned(false);
    },
    onError: () => toast.error("Failed to send message"),
  });

  // Toggle message pin
  const togglePinMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("admin_messages")
        .update({ is_pinned: isPinned })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages-list"] });
      toast.success("Pin status updated");
    },
  });

  // Delete message
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("admin_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages-list"] });
      toast.success("Message deleted");
    },
  });

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show bootstrap option if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Admin Access Required
            </CardTitle>
            <CardDescription>
              Enter your admin bootstrap key to gain access to this dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bootstrap-key">Admin Bootstrap Key</Label>
              <Input
                id="bootstrap-key"
                type="password"
                placeholder="Enter your secret key..."
                value={bootstrapKey}
                onChange={(e) => setBootstrapKey(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => bootstrapMutation.mutate()}
              disabled={!bootstrapKey || bootstrapMutation.isPending}
            >
              {bootstrapMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Activate Admin Access
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Don't have a key? Contact the platform developer.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingLocations = locationRequests?.filter(r => r.status === "pending") || [];
  const customerProfiles = profiles?.filter(p => p.user_type === "customer") || [];
  const businessProfiles = profiles?.filter(p => p.user_type === "business") || [];
  const pendingOrders = orders?.filter(o => ["pending", "confirmed", "processing", "shipped"].includes(o.status)) || [];
  const pendingJobs = jobs?.filter(j => ["requested", "quoted", "accepted", "in_progress"].includes(j.status)) || [];
  const pinnedMessages = adminMessages?.filter(m => m.is_pinned) || [];

  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(profiles?.map(p => p.user_id) || []);
    } else {
      setSelectedUsers([]);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              String Admin Console
            </h1>
            <p className="text-muted-foreground">Full platform management dashboard</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setShowMessageDialog(true)} variant="outline">
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
            {pendingLocations.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingLocations.length} pending locations
              </Badge>
            )}
            {pendingOrders.length > 0 && (
              <Badge variant="secondary">{pendingOrders.length} active orders</Badge>
            )}
            {pinnedMessages.length > 0 && (
              <Badge variant="outline">
                <Pin className="h-3 w-3 mr-1" />
                {pinnedMessages.length} pinned
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{profiles?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{customerProfiles.length}</p>
                  <p className="text-xs text-muted-foreground">Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-green-500" />
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
                <Crown className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {businesses?.filter((b: any) => b.verification_tier === 'premium').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Premium</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-8 w-8 text-purple-500" />
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
                <Briefcase className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{jobs?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Input
          placeholder="Search users, businesses, orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="users" className="gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="businesses" className="gap-1">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Businesses</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-1">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-1">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Locations</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="commission" className="gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Commission</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management ({profiles?.length || 0})</CardTitle>
                    <CardDescription>View and manage all registered users</CardDescription>
                  </div>
                  {selectedUsers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{selectedUsers.length} selected</Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setMessageRecipientType('all');
                          setShowMessageDialog(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Message Selected
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingProfiles ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === profiles?.length}
                            onChange={(e) => handleSelectAllUsers(e.target.checked)}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles
                        ?.filter((p: any) => 
                          p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.email?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((profile: any) => (
                          <TableRow key={profile.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(profile.user_id)}
                                onChange={() => toggleUserSelection(profile.user_id)}
                                className="rounded"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${profile.user_type === 'business' ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                                  {profile.user_type === 'business' ? (
                                    <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{profile.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={profile.user_type === 'business' ? 'default' : 'secondary'}>
                                {profile.user_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={profile.onboarding_completed ? 'outline' : 'destructive'}>
                                {profile.onboarding_completed ? 'Active' : 'Onboarding'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(profile.created_at), "MMM d, yyyy")}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Businesses Tab with Tier Management */}
          <TabsContent value="businesses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Verification & Tiers ({businesses?.length || 0})</CardTitle>
                <CardDescription>Manage verification tiers: None → Verified → Premium</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBusinesses ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Current Tier</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {businesses
                        ?.filter((b: any) => 
                          b.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((business: any) => (
                          <TableRow key={business.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{business.company_name}</p>
                                <p className="text-xs text-muted-foreground">{business.profiles?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{business.business_type || 'goods'}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={business.location_verified ? "default" : "secondary"}>
                                {business.location_verified ? "Verified ✓" : "Not Verified"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <TierBadge tier={business.verification_tier || 'none'} />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={business.verification_tier || 'none'}
                                onValueChange={(value: VerificationTier) => 
                                  updateVerificationTierMutation.mutate({ 
                                    businessId: business.id, 
                                    tier: value 
                                  })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    <span className="flex items-center gap-2">
                                      <XCircle className="h-4 w-4 text-muted-foreground" />
                                      None
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="verified">
                                    <span className="flex items-center gap-2">
                                      <Shield className="h-4 w-4 text-blue-500" />
                                      Verified
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="premium">
                                    <span className="flex items-center gap-2">
                                      <Crown className="h-4 w-4 text-yellow-500" />
                                      Premium
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab with Admin Confirm */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Management ({orders?.length || 0})</CardTitle>
                <CardDescription>Monitor and manage customer orders. Admins can confirm deliveries.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : orders?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No orders yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders
                        ?.filter((o: any) => 
                          o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.businesses?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.order_number}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(order.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{order.customers?.profiles?.full_name || 'Unknown'}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{order.businesses?.company_name}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">₦{Number(order.total).toLocaleString()}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                order.status === 'delivered' ? 'default' :
                                order.status === 'cancelled' ? 'destructive' :
                                'secondary'
                              }>
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {order.status === 'shipped' && (
                                <Button
                                  size="sm"
                                  onClick={() => confirmDeliveryMutation.mutate({ orderId: order.id })}
                                  disabled={confirmDeliveryMutation.isPending}
                                >
                                  <PackageCheck className="h-4 w-4 mr-1" />
                                  Confirm Delivery
                                </Button>
                              )}
                              {order.status === 'processing' && (
                                <Badge variant="outline" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  Processing
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab with Admin Complete */}
          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Job Management ({jobs?.length || 0})</CardTitle>
                <CardDescription>Monitor service requests. Admins can mark jobs complete.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingJobs ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : jobs?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No jobs yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs
                        ?.filter((j: any) => 
                          j.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          j.title?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((job: any) => (
                          <TableRow key={job.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{job.title}</p>
                                <p className="text-xs text-muted-foreground">{job.job_number}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{job.customers?.profiles?.full_name || 'Unknown'}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{job.businesses?.company_name}</p>
                            </TableCell>
                            <TableCell>
                              {job.final_price ? (
                                <p className="font-medium">₦{Number(job.final_price).toLocaleString()}</p>
                              ) : job.quoted_price ? (
                                <p className="text-muted-foreground">₦{Number(job.quoted_price).toLocaleString()} (quoted)</p>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                job.status === 'completed' ? 'default' :
                                job.status === 'cancelled' ? 'destructive' :
                                'secondary'
                              }>
                                {job.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {job.status === 'in_progress' && (
                                <Button
                                  size="sm"
                                  onClick={() => completeJobMutation.mutate({ jobId: job.id })}
                                  disabled={completeJobMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark Complete
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Location Verification ({pendingLocations.length} pending)</CardTitle>
                <CardDescription>
                  Verify user locations by looking up their address on Google Maps
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLocations ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : locationRequests?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No location requests</p>
                ) : (
                  <div className="space-y-4">
                    {locationRequests?.map((request: any) => (
                      <LocationVerificationCard
                        key={request.id}
                        request={request}
                        onVerify={(lat, lng) => verifyLocationMutation.mutate({
                          requestId: request.id,
                          userId: request.user_id,
                          userType: request.user_type,
                          latitude: lat,
                          longitude: lng,
                          approved: true,
                        })}
                        onReject={() => verifyLocationMutation.mutate({
                          requestId: request.id,
                          userId: request.user_id,
                          userType: request.user_type,
                          approved: false,
                        })}
                        isLoading={verifyLocationMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Admin Messages ({adminMessages?.length || 0})</CardTitle>
                    <CardDescription>Send announcements and pinned messages to users</CardDescription>
                  </div>
                  <Button onClick={() => setShowMessageDialog(true)}>
                    <Send className="h-4 w-4 mr-2" />
                    New Message
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingMessages ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : adminMessages?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No messages sent yet</p>
                ) : (
                  <div className="space-y-3">
                    {adminMessages?.map((message: any) => (
                      <div 
                        key={message.id} 
                        className={`p-4 border rounded-lg ${message.is_pinned ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {message.is_pinned && <Pin className="h-4 w-4 text-yellow-500" />}
                              <h4 className="font-medium">{message.title}</h4>
                              <Badge variant="outline">{message.recipient_type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{message.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Sent {format(new Date(message.created_at), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => togglePinMutation.mutate({
                                messageId: message.id,
                                isPinned: !message.is_pinned,
                              })}
                            >
                              <Pin className={`h-4 w-4 ${message.is_pinned ? 'fill-current text-yellow-500' : ''}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMessageMutation.mutate(message.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commission Tab */}
          <TabsContent value="commission" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Commission ({products?.length || 0})</CardTitle>
                <CardDescription>Set commission rates (1-20%) for each product</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <div className="space-y-3">
                    {products
                      ?.filter((p: any) => 
                        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((product: any) => (
                        <ProductCommissionCard
                          key={product.id}
                          product={product}
                          onUpdate={(commission, isRare) => 
                            updateCommissionMutation.mutate({ 
                              productId: product.id, 
                              commission, 
                              isRare 
                            })
                          }
                          isLoading={updateCommissionMutation.isPending}
                        />
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Admin Message</DialogTitle>
            <DialogDescription>
              Send an announcement or notification to platform users
            </DialogDescription>
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
              <Switch
                checked={messagePinned}
                onCheckedChange={setMessagePinned}
              />
              <Label>Pin this message</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => sendMessageMutation.mutate()}
              disabled={!messageTitle || !messageContent || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Tier Badge Component
function TierBadge({ tier }: { tier: string }) {
  switch (tier) {
    case 'premium':
      return (
        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
          <Crown className="h-3 w-3 mr-1" />
          Premium
        </Badge>
      );
    case 'verified':
      return (
        <Badge className="bg-blue-500 text-white">
          <Shield className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          None
        </Badge>
      );
  }
}

// Location Verification Card Component
function LocationVerificationCard({ 
  request, 
  onVerify, 
  onReject, 
  isLoading 
}: { 
  request: any;
  onVerify: (lat: number, lng: number) => void;
  onReject: () => void;
  isLoading: boolean;
}) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const handleVerify = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Please enter valid coordinates");
      return;
    }
    onVerify(lat, lng);
  };

  const isPending = request.status === "pending";

  return (
    <div className={`p-4 border rounded-lg ${isPending ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={request.user_type === 'business' ? 'default' : 'secondary'}>
              {request.user_type}
            </Badge>
            <Badge variant={
              request.status === 'pending' ? 'outline' :
              request.status === 'verified' ? 'default' :
              'destructive'
            }>
              {request.status}
            </Badge>
          </div>
          <p className="font-medium">{request.profiles?.full_name}</p>
          <p className="text-sm text-muted-foreground">{request.profiles?.email}</p>
          <div className="mt-2 p-2 bg-muted rounded text-sm">
            <p><strong>Street:</strong> {request.street_address}</p>
            {request.area_name && <p><strong>Area:</strong> {request.area_name}</p>}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Submitted: {format(new Date(request.created_at), "MMM d, yyyy h:mm a")}
          </p>
        </div>
        
        {isPending && (
          <div className="space-y-3 min-w-[200px]">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input
                placeholder="e.g. 6.9023"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input
                placeholder="e.g. 3.4213"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleVerify}
                disabled={isLoading || !latitude || !longitude}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Verify
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onReject}
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Product Commission Card Component
function ProductCommissionCard({ 
  product, 
  onUpdate, 
  isLoading 
}: { 
  product: any;
  onUpdate: (commission: number, isRare: boolean) => void;
  isLoading: boolean;
}) {
  const [commission, setCommission] = useState(product.commission_percent || 10);
  const [isRare, setIsRare] = useState(product.is_rare || false);

  const handleUpdate = () => {
    onUpdate(commission, isRare);
  };

  const hasChanges = commission !== product.commission_percent || isRare !== product.is_rare;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{product.name}</p>
          {product.is_rare && <Badge variant="destructive">Rare</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {product.businesses?.company_name} • ₦{Number(product.price || 0).toLocaleString()}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={20}
            value={commission}
            onChange={(e) => setCommission(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-16 h-8 text-center"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isRare}
            onChange={(e) => setIsRare(e.target.checked)}
            className="rounded"
          />
          Rare
        </label>
        <Button
          size="sm"
          onClick={handleUpdate}
          disabled={isLoading || !hasChanges}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
