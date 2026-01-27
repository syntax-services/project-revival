import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [selectedReview, setSelectedReview] = useState<any>(null);

  // Fetch businesses for moderation
  const { data: businesses, isLoading: businessesLoading } = useQuery({
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
  const { data: reviews, isLoading: reviewsLoading } = useQuery({
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

  // Fetch platform stats
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [businessesRes, customersRes, ordersRes, jobsRes, reviewsRes] = await Promise.all([
        supabase.from("businesses").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
      ]);

      return {
        totalBusinesses: businessesRes.count || 0,
        totalCustomers: customersRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalJobs: jobsRes.count || 0,
        totalReviews: reviewsRes.count || 0,
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

  const filteredBusinesses = businesses?.filter((b) =>
    b.company_name.toLowerCase().includes(search.toLowerCase()) ||
    b.industry?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const unverifiedBusinesses = filteredBusinesses.filter((b) => !b.verified);
  const verifiedBusinesses = filteredBusinesses.filter((b) => b.verified);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Admin Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">Platform moderation and oversight</p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats?.totalBusinesses || 0}</p>
                <p className="text-sm text-muted-foreground">Businesses</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats?.totalCustomers || 0}</p>
                <p className="text-sm text-muted-foreground">Customers</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Star className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats?.totalReviews || 0}</p>
                <p className="text-sm text-muted-foreground">Reviews</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats?.totalOrders || 0}</p>
                <p className="text-sm text-muted-foreground">Orders</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Flag className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats?.totalJobs || 0}</p>
                <p className="text-sm text-muted-foreground">Jobs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search businesses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Pending ({unverifiedBusinesses.length})
            </TabsTrigger>
            <TabsTrigger value="verified" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Verified ({verifiedBusinesses.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Reviews ({reviews?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {businessesLoading ? (
              <div className="dashboard-card animate-pulse h-24" />
            ) : unverifiedBusinesses.length === 0 ? (
              <div className="dashboard-card text-center py-8">
                <CheckCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">All businesses are verified</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unverifiedBusinesses.map((business) => (
                  <div key={business.id} className="dashboard-card flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{business.company_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {business.industry} • {business.business_location}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {format(new Date(business.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBusiness(business)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => verifyBusiness.mutate({ businessId: business.id, verified: true })}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="verified" className="mt-4">
            {verifiedBusinesses.length === 0 ? (
              <div className="dashboard-card text-center py-8">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No verified businesses yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {verifiedBusinesses.map((business) => (
                  <div key={business.id} className="dashboard-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="default">Verified</Badge>
                      <div>
                        <h3 className="font-medium text-foreground">{business.company_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {business.industry} • {business.business_location}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verifyBusiness.mutate({ businessId: business.id, verified: false })}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            {reviewsLoading ? (
              <div className="dashboard-card animate-pulse h-24" />
            ) : reviews?.length === 0 ? (
              <div className="dashboard-card text-center py-8">
                <Star className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews?.map((review) => (
                  <div key={review.id} className="dashboard-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= review.rating
                                    ? "fill-foreground text-foreground"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          {review.verified_purchase && (
                            <Badge variant="secondary" className="text-xs">Verified</Badge>
                          )}
                        </div>
                        {review.title && (
                          <h4 className="mt-1 font-medium text-foreground">{review.title}</h4>
                        )}
                        {review.content && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{review.content}</p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          For: {review.businesses?.company_name || "Unknown"} • {format(new Date(review.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setSelectedReview(review)}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Business Details</DialogTitle>
            </DialogHeader>
            {selectedBusiness && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="font-medium text-foreground">{selectedBusiness.company_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Industry</p>
                  <p className="text-foreground">{selectedBusiness.industry || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="text-foreground">{selectedBusiness.business_location || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Business Type</p>
                  <Badge>{selectedBusiness.business_type || "goods"}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">About</p>
                  <p className="text-foreground">{selectedBusiness.products_services || "No description"}</p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={() => verifyBusiness.mutate({ businessId: selectedBusiness.id, verified: true })}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify Business
                  </Button>
                  <Button
                    variant="outline"
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Review</DialogTitle>
            </DialogHeader>
            {selectedReview && (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Are you sure you want to remove this review? This action cannot be undone.
                </p>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium text-foreground">{selectedReview.title || "No title"}</p>
                  <p className="text-sm text-muted-foreground">{selectedReview.content || "No content"}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => deleteReview.mutate(selectedReview.id)}
                  >
                    Remove Review
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedReview(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
