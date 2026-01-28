import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  MapPin, Users, ShoppingBag, Briefcase, CheckCircle, XCircle, 
  Clock, AlertTriangle, Eye, Building2, User, Loader2, RefreshCw,
  DollarSign, Settings, Search
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function StringAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("location");
  const [searchTerm, setSearchTerm] = useState("");

  // Check if user has admin role
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["admin-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Fetch location requests
  const { data: locationRequests, isLoading: loadingLocations } = useQuery({
    queryKey: ["admin-location-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_requests")
        .select(`
          *,
          profiles:user_id (full_name, email, user_type)
        `)
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

  // Fetch all products for commission management
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          businesses:business_id (company_name)
        `)
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
        .select(`
          *,
          businesses:business_id (company_name),
          customers:customer_id (user_id)
        `)
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
      requestId, 
      userId, 
      userType, 
      latitude, 
      longitude,
      approved
    }: { 
      requestId: string; 
      userId: string; 
      userType: string;
      latitude?: number; 
      longitude?: number;
      approved: boolean;
    }) => {
      // Update request status
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
        // Update user's actual location
        const table = userType === "business" ? "businesses" : "customers";
        const { error: updateError } = await supabase
          .from(table)
          .update({
            latitude,
            longitude,
            location_verified: true,
            location_verified_at: new Date().toISOString(),
            location_verified_by: user?.id,
          })
          .eq("user_id", userId);

        if (updateError) throw updateError;

        // Also update profile
        await supabase
          .from("profiles")
          .update({ latitude, longitude })
          .eq("user_id", userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-location-requests"] });
      toast.success("Location request processed");
    },
    onError: (error: any) => {
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
    onError: () => {
      toast.error("Failed to update commission");
    },
  });

  // Verify business
  const verifyBusinessMutation = useMutation({
    mutationFn: async ({ businessId, verified }: { businessId: string; verified: boolean }) => {
      const { error } = await supabase
        .from("businesses")
        .update({ verified })
        .eq("id", businessId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Business verification updated");
    },
    onError: () => {
      toast.error("Failed to update business");
    },
  });

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const pendingLocations = locationRequests?.filter(r => r.status === "pending") || [];

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
          <div className="flex items-center gap-4">
            {pendingLocations.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingLocations.length} pending locations
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <p className="text-2xl font-bold">{products?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Products</p>
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
                <MapPin className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{pendingLocations.length}</p>
                  <p className="text-xs text-muted-foreground">Pending Locations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="location" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Locations</span>
            </TabsTrigger>
            <TabsTrigger value="businesses" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Businesses</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Commission</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
          </TabsList>

          {/* Location Verification Tab */}
          <TabsContent value="location" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Location Verification Requests</CardTitle>
                <CardDescription>
                  Verify user locations by looking up their address on Google Maps and entering the coordinates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLocations ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
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

          {/* Businesses Tab */}
          <TabsContent value="businesses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Management</CardTitle>
                <CardDescription>Verify and manage registered businesses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Search businesses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                {loadingBusinesses ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <div className="space-y-3">
                    {businesses
                      ?.filter((b: any) => 
                        b.company_name.toLowerCase().includes(searchTerm.toLowerCase())
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
                                {business.street_address || 'No address'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
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

          {/* Commission Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Commission Management</CardTitle>
                <CardDescription>Set commission rates (1-20%) for each product based on price and rarity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                {loadingProducts ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <div className="space-y-3">
                    {products
                      ?.filter((p: any) => 
                        p.name.toLowerCase().includes(searchTerm.toLowerCase())
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

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Monitor all platform orders and deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <div className="space-y-3">
                    {orders?.map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.businesses?.company_name} • ₦{order.total?.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), "PPp")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            order.status === "delivered" ? "default" :
                            order.status === "cancelled" ? "destructive" :
                            "secondary"
                          }>
                            {order.status}
                          </Badge>
                          <Badge variant="outline">{order.delivery_type || "pickup"}</Badge>
                        </div>
                      </div>
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
  const [showVerify, setShowVerify] = useState(false);

  const handleVerify = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Please enter valid coordinates");
      return;
    }
    onVerify(lat, lng);
    setShowVerify(false);
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    verified: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {request.user_type === "business" ? (
            <Building2 className="h-8 w-8 text-primary" />
          ) : (
            <User className="h-8 w-8 text-primary" />
          )}
          <div>
            <p className="font-medium">{request.profiles?.full_name || "Unknown User"}</p>
            <p className="text-sm text-muted-foreground">{request.profiles?.email}</p>
            <Badge variant="outline" className="mt-1">{request.user_type}</Badge>
          </div>
        </div>
        <Badge className={statusColors[request.status as keyof typeof statusColors]}>
          {request.status}
        </Badge>
      </div>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-sm font-medium mb-1">Address to verify:</p>
        <p className="text-sm">{request.street_address}</p>
        {request.area_name && (
          <p className="text-sm text-muted-foreground">Area: {request.area_name}</p>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Submitted: {format(new Date(request.created_at), "PPp")}
      </div>

      {request.status === "pending" && (
        <div className="flex flex-col gap-2">
          {showVerify ? (
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium">
                Look up the address on Google Maps and enter the coordinates:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="lat" className="text-xs">Latitude</Label>
                  <Input
                    id="lat"
                    placeholder="e.g., 6.9167"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lng" className="text-xs">Longitude</Label>
                  <Input
                    id="lng"
                    placeholder="e.g., 3.7167"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleVerify} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Verification"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowVerify(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setShowVerify(true)}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Location
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onReject}
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}
        </div>
      )}
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
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    onUpdate(commission, isRare);
    setEditing(false);
  };

  // Suggest commission based on price
  const suggestedCommission = () => {
    const price = product.price || 0;
    if (price < 500) return 20;
    if (price < 2000) return 15;
    if (price < 5000) return 10;
    return 5;
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded object-cover" />
          ) : (
            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium">{product.name}</p>
            <p className="text-sm text-muted-foreground">
              {product.businesses?.company_name} • ₦{product.price?.toLocaleString() || 0}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {product.is_rare && <Badge variant="secondary">Rare</Badge>}
          <Badge variant="outline">{product.commission_percent || 10}%</Badge>
          <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-xs">Commission Rate (%)</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Suggested: {suggestedCommission()}% based on ₦{product.price?.toLocaleString()} price
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`rare-${product.id}`}
                checked={isRare}
                onChange={(e) => setIsRare(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor={`rare-${product.id}`} className="text-sm">Mark as Rare</Label>
            </div>
          </div>
          <Button size="sm" onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}