import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Building2,
  Users,
  Star,
  Flag,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Gift,
  Package,
  Sparkles,
  Pin,
  Store,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getMaskedAssetUrl } from "@/lib/assetMask";

export default function AdminDashboard() {
  usePageMeta({
    title: "Admin Operations & Moderation",
    description: "Platform analytics, merchant approvals, and moderation console.",
    noindex: true,
    });

  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [selectedReview, setSelectedReview] = useState<any>(null);

  // Fetch businesses for moderation
  const { data: businesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch reviews for moderation
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, businesses(company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch products for Home Showcase management
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, businesses(id, company_name, logo_url, verified)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Toggle Featured status mutation for Home Page Showcase
  const toggleFeaturedProduct = useMutation({
    mutationFn: async ({ productId, isFeatured }: { productId: string; isFeatured: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ is_featured: isFeatured })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.isFeatured ? "Product Pushed to Home Page" : "Product Removed from Home Showcase" });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // Fetch platform stats
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [businessesRes, customersRes, ordersRes, jobsRes, reviewsRes, referralsRes, offersRes] = await Promise.all([
        supabase.from("businesses").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("referrals").select("id", { count: "exact", head: true }),
        supabase.from("offers").select("id", { count: "exact", head: true }),
      ]);

      return {
        totalBusinesses: businessesRes.count || 0,
        totalCustomers: customersRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalJobs: jobsRes.count || 0,
        totalReviews: reviewsRes.count || 0,
        totalReferrals: referralsRes.count || 0,
        totalOffers: offersRes.count || 0,
      };
    },
  });

  // Verify business mutation
  const verifyBusiness = useMutation({
    mutationFn: async ({ businessId, verified }: { businessId: string; verified: boolean }) => {
      const { error } = await supabase
        .from("businesses")
        .update({ verified })
        .eq("id", businessId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Business status updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      setSelectedBusiness(null);
    },
  });

  // Delete review mutation
  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Review removed" });
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setSelectedReview(null);
    },
  });

  const filteredBusinesses = businesses.filter((b) =>
    b.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.industry && b.industry.toLowerCase().includes(search.toLowerCase()))
  );

  const unverifiedBusinesses = filteredBusinesses.filter((b) => !b.verified);
  const verifiedBusinesses = filteredBusinesses.filter((b) => b.verified);

  const filteredProducts = allProducts.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
    (p.businesses?.company_name && p.businesses.company_name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth?mode=login", { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6 text-left">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Admin Management Console
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">Platform moderation, verification & home page curation</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-2xl text-xs font-bold">
            Sign Out
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          <div className="dashboard-card p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{stats?.totalBusinesses || 0}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Businesses</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{stats?.totalCustomers || 0}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Customers</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{stats?.totalReviews || 0}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Reviews</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{stats?.totalOrders || 0}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Orders</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Flag className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{stats?.totalJobs || 0}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Jobs</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Gift className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{stats?.totalReferrals || 0}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Referrals</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-black text-foreground">{stats?.totalOffers || 0}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Offers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search businesses, products, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-2xl google-input text-xs"
          />
        </div>

        <Tabs defaultValue="showcase" className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl rounded-2xl h-11 bg-muted/40 p-1 border border-border/20">
            <TabsTrigger value="showcase" className="flex items-center gap-1.5 text-xs font-bold rounded-xl data-[state=active]:bg-card">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Home Showcase ({allProducts.filter((p: any) => p.is_featured).length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-1.5 text-xs font-bold rounded-xl data-[state=active]:bg-card">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Pending ({unverifiedBusinesses.length})
            </TabsTrigger>
            <TabsTrigger value="verified" className="flex items-center gap-1.5 text-xs font-bold rounded-xl data-[state=active]:bg-card">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              Verified ({verifiedBusinesses.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-1.5 text-xs font-bold rounded-xl data-[state=active]:bg-card">
              <Star className="h-3.5 w-3.5" />
              Reviews ({reviews.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: HOME SHOWCASE CURATION */}
          <TabsContent value="showcase" className="mt-4 space-y-3">
            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Admin Home Page Push:</strong> Curate trending or high-demand products onto the campus Home Page social feed.
                </span>
              </div>
            </div>

            {productsLoading ? (
              <div className="dashboard-card animate-pulse h-24" />
            ) : filteredProducts.length === 0 ? (
              <div className="dashboard-card text-center py-12">
                <Package className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
                <p className="mt-2 text-xs text-muted-foreground">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredProducts.map((product: any) => {
                  const isFeatured = !!product.is_featured;
                  return (
                    <div
                      key={product.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        isFeatured
                          ? "bg-amber-500/5 border-amber-500/40 shadow-xs"
                          : "bg-card border-border/20"
                      }`}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/20">
                          {product.image_url ? (
                            <img src={getMaskedAssetUrl(product.image_url)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-6 w-6 m-auto text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-foreground truncate">{product.name}</h4>
                          <p className="text-[11px] font-black text-primary mt-0.5">
                            ₦{Number(product.price || 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Store className="h-3 w-3" /> {product.businesses?.company_name || "Merchant"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/10">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          {product.category || "General"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: PENDING BUSINESSES */}
          <TabsContent value="pending" className="mt-4">
            {businessesLoading ? (
              <div className="dashboard-card animate-pulse h-24" />
            ) : unverifiedBusinesses.length === 0 ? (
              <div className="dashboard-card text-center py-8">
                <CheckCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground text-xs">All businesses are verified</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unverifiedBusinesses.map((business) => (
                  <div key={business.id} className="dashboard-card flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-foreground">{business.company_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {business.industry} • {business.business_location}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Joined {format(new Date(business.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBusiness(business)}
                        className="rounded-xl text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => verifyBusiness.mutate({ businessId: business.id, verified: true })}
                        className="rounded-xl text-xs font-bold"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Verify
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: VERIFIED BUSINESSES */}
          <TabsContent value="verified" className="mt-4">
            {verifiedBusinesses.length === 0 ? (
              <div className="dashboard-card text-center py-8">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground text-xs">No verified businesses yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {verifiedBusinesses.map((business) => (
                  <div key={business.id} className="dashboard-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="default" className="text-xs font-bold">Verified</Badge>
                      <div>
                        <h3 className="font-bold text-xs text-foreground">{business.company_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {business.industry} • {business.business_location}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBusiness(business)}
                      className="rounded-xl text-xs"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 4: REVIEWS */}
          <TabsContent value="reviews" className="mt-4">
            {reviewsLoading ? (
              <div className="dashboard-card animate-pulse h-24" />
            ) : reviews.length === 0 ? (
              <div className="dashboard-card text-center py-8">
                <Star className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground text-xs">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="dashboard-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3.5 w-3.5 ${
                                  star <= review.rating
                                    ? "fill-primary text-primary"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          {review.verified_purchase && (
                            <Badge variant="secondary" className="text-[10px]">Verified</Badge>
                          )}
                        </div>
                        {review.title && (
                          <h4 className="mt-1 font-bold text-xs text-foreground">{review.title}</h4>
                        )}
                        {review.content && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{review.content}</p>
                        )}
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          For: {review.businesses?.company_name || "Unknown"} • {format(new Date(review.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setSelectedReview(review)}
                        className="rounded-xl h-8 w-8 p-0"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Business Detail Dialog */}
        <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-border/20">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Business Details</DialogTitle>
            </DialogHeader>
            {selectedBusiness && (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Company Name</p>
                  <p className="font-bold text-foreground">{selectedBusiness.company_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Industry</p>
                  <p className="text-foreground">{selectedBusiness.industry || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="text-foreground">{selectedBusiness.business_location || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Business Type</p>
                  <Badge className="capitalize">{selectedBusiness.business_type || "goods"}</Badge>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1 rounded-2xl text-xs font-bold"
                    onClick={() => verifyBusiness.mutate({ businessId: selectedBusiness.id, verified: true })}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Verify Business
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl text-xs font-bold"
                    onClick={() => setSelectedBusiness(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Review Dialog */}
        <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-border/20">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Delete Review?</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to remove this review permanently?
            </p>
            <div className="flex gap-2 justify-end pt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedReview(null)} className="rounded-2xl text-xs font-bold">
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => selectedReview && deleteReview.mutate(selectedReview.id)}
                className="rounded-2xl text-xs font-bold"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
