import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  BarChart3, 
  TrendingUp,
  Target,
  Rocket,
  Users,
  MousePointer2,
  Lightbulb,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
  ShoppingBag, 
  DollarSign,
  Star
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  avgOrderValue: number;
}

export default function BusinessInsights() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join query with dynamic shape
  const [recentReviews, setRecentReviews] = useState<any[]>([]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!user) return;

      try {
        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (business) {
          // Fetch completed orders
          const { data: orders } = await supabase
            .from("orders")
            .select("total, customer_id")
            .eq("business_id", business.id)
            .eq("status", "delivered");

          const totalOrders = orders?.length || 0;
          const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
          const uniqueCustomers = new Set(orders?.map(o => o.customer_id)).size;
          const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

          setStats({
            totalOrders,
            totalRevenue,
            totalCustomers: uniqueCustomers,
            avgOrderValue
          });

          // Fetch recent reviews
          const { data: reviews } = await supabase
            .from("reviews")
            .select("*, customers(profiles(full_name))")
            .eq("business_id", business.id)
            .order("created_at", { ascending: false })
            .limit(3);
          
          setRecentReviews(reviews || []);
        }
      } catch (error) {
        console.error("Error fetching insights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Business Insights</h1>
          <p className="mt-1 text-muted-foreground">Key performance metrics with practical guidance based on your current activity</p>
        </div>

        {!stats || stats.totalOrders === 0 ? (
          <div className="dashboard-card text-center py-16 border-dashed border-2">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
            <h3 className="mt-4 font-semibold text-foreground text-lg">No data to analyze yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
              Completed orders and customer feedback will help us show clearer recommendations here.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-900/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between">
                    Revenue
                    <DollarSign className="h-3 w-3" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{"\u20A6"}{stats.totalRevenue.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-purple-50/50 dark:bg-purple-900/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center justify-between">
                    Orders
                    <ShoppingBag className="h-3 w-3" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-green-50/50 dark:bg-green-900/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider flex items-center justify-between">
                    Customers
                    <Users className="h-3 w-3" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-amber-50/50 dark:bg-amber-900/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
                    Avg. Order
                    <TrendingUp className="h-3 w-3" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{'\u20A6'}{Math.round(stats.avgOrderValue).toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
               <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recommended next steps
            </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                     <span className="text-sm text-foreground">Retention signal</span>
                     <span className={`text-sm font-bold ${stats.totalOrders > 5 ? "text-green-600" : "text-amber-600"}`}>
                       {stats.totalOrders > 5 ? "Stable" : "Building"}
                     </span>
                   </div>
                   <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                     <span className="text-sm text-foreground">Growth stage hint</span>
                     <span className={`text-sm font-bold ${stats.totalRevenue > 100000 ? "text-blue-600" : "text-slate-600"}`}>
                       {stats.totalRevenue > 100000 ? "Expanding" : "Seed Stage"}
                     </span>
                   </div>
                   <div className="space-y-2 pt-2">
                      <p className="text-xs text-muted-foreground italic">
                        {stats.totalOrders === 0 
                          ? "\"Complete your profile and add more products to start receiving orders.\""
                          : stats.avgOrderValue < 5000 
                            ? "\"Consider bundling products to increase your average order value.\""
                            : "\"You're seeing healthy traction. Focus on collecting more customer reviews.\""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        These are guidance notes based on your current profile, orders, and reviews, not market-wide forecasts.
                      </p>
                   </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Recent Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentReviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 italic">No customer reviews yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {recentReviews.map((review, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`h-2.5 w-2.5 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
                            ))}
                            <span className="text-[10px] text-muted-foreground ml-1">{((review.customers as { profiles?: { full_name?: string } })?.profiles)?.full_name || "Customer"}</span>
                          </div>
                          <p className="text-xs text-foreground line-clamp-1 italic">"{review.comment}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
