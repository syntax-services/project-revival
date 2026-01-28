import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  MapPin, ShoppingBag, Briefcase, CheckCircle, XCircle, 
  Clock, Building2, User, Loader2, Users,
  DollarSign, Settings, Key
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function StringAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [showBootstrap, setShowBootstrap] = useState(false);
  const [bootstrapKey, setBootstrapKey] = useState("");

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
      setShowBootstrap(false);
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
  const { data: customers, isLoading: loadingCustomers } = useQuery({
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
        .select("*, businesses:business_id (company_name)")
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
        .select("*, businesses:business_id (company_name)")
        .order("created_at", { ascending: false })
        .limit(100);
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

  // Verify business
  const verifyBusinessMutation = useMutation({
    mutationFn: async ({ businessId, verified }: { businessId: string; verified: boolean }) => {
      const { error } = await supabase.from("businesses").update({ verified }).eq("id", businessId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Business verification updated");
    },
    onError: () => toast.error("Failed to update business"),
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
  const pendingOrders = orders?.filter(o => ["pending", "confirmed", "processing"].includes(o.status)) || [];
  const pendingJobs = jobs?.filter(j => ["requested", "quoted"].includes(j.status)) || [];

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
            <p className="text-muted-foreground">Developer management dashboard</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingLocations.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingLocations.length} pending locations
              </Badge>
            )}
            {pendingOrders.length > 0 && (
              <Badge variant="secondary">{pendingOrders.length} active orders</Badge>
            )}
            {pendingJobs.length > 0 && (
              <Badge variant="outline">{pendingJobs.length} active jobs</Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <TabsList className="grid w-full grid-cols-6">
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
            <TabsTrigger value="commission" className="gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Commission</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Users ({profiles?.length || 0})</CardTitle>
                <CardDescription>View and manage all registered users</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProfiles ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <div className="space-y-3">
                    {profiles
                      ?.filter((p: any) => 
                        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((profile: any) => (
                        <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${profile.user_type === 'business' ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                              {profile.user_type === 'business' ? (
                                <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                              ) : (
                                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{profile.full_name}</p>
                              <p className="text-sm text-muted-foreground">{profile.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Joined {format(new Date(profile.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={profile.user_type === 'business' ? 'default' : 'secondary'}>
                              {profile.user_type}
                            </Badge>
                            <Badge variant={profile.onboarding_completed ? 'outline' : 'destructive'}>
                              {profile.onboarding_completed ? 'Active' : 'Onboarding'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Businesses Tab */}
          <TabsContent value="businesses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Management ({businesses?.length || 0})</CardTitle>
                <CardDescription>Verify and manage registered businesses</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBusinesses ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <div className="space-y-3">
                    {businesses
                      ?.filter((b: any) => 
                        b.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((business: any) => (
                        <div key={business.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-10 w-10 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{business.company_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {business.profiles?.email} • {business.business_type || 'goods'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {business.street_address || 'No address'} • {business.area_name || 'No area'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={business.location_verified ? "default" : "outline"}>
                              {business.location_verified ? "Location ✓" : "Location ✗"}
                            </Badge>
                            <Badge variant={business.verified ? "default" : "secondary"}>
                              {business.verified ? "Verified" : "Unverified"}
                            </Badge>
                            <Button
                              size="sm"
                              variant={business.verified ? "outline" : "default"}
                              onClick={() => verifyBusinessMutation.mutate({
                                businessId: business.id,
                                verified: !business.verified,
                              })}
                            >
                              {business.verified ? "Unverify" : "Verify"}
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders Overview ({orders?.length || 0})</CardTitle>
                <CardDescription>Monitor customer orders and fulfillment</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : orders?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {orders
                      ?.filter((o: any) => 
                        o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        o.businesses?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{order.order_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.businesses?.company_name} • ₦{Number(order.total).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.created_at), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                          <Badge variant={
                            order.status === 'delivered' ? 'default' :
                            order.status === 'cancelled' ? 'destructive' :
                            'secondary'
                          }>
                            {order.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Jobs Overview ({jobs?.length || 0})</CardTitle>
                <CardDescription>Monitor service requests and job completion</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingJobs ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : jobs?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No jobs yet</p>
                ) : (
                  <div className="space-y-3">
                    {jobs
                      ?.filter((j: any) => 
                        j.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        j.title?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((job: any) => (
                        <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{job.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {job.job_number} • {job.businesses?.company_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(job.created_at), "MMM d, yyyy")}
                              {job.final_price && ` • ₦${Number(job.final_price).toLocaleString()}`}
                            </p>
                          </div>
                          <Badge variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'cancelled' ? 'destructive' :
                            'secondary'
                          }>
                            {job.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
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
    </div>
  );
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