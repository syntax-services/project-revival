import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomer, useCustomerStats, useCustomerOrders, useCustomerJobs } from "@/hooks/useCustomer";
import { useNavigate } from "react-router-dom";
import { Search, Heart, Package, Briefcase, Bell, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function CustomerOverview() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { data: customer } = useCustomer();
  const { data: stats, isLoading: statsLoading } = useCustomerStats(customer?.id);
  const { data: orders = [] } = useCustomerOrders(customer?.id);
  const { data: jobs = [] } = useCustomerJobs(customer?.id);

  const activeOrders = orders.filter(o => 
    ["pending", "confirmed", "processing", "shipped"].includes(o.status)
  ).slice(0, 3);
  
  const activeJobs = jobs.filter(j => 
    ["requested", "quoted", "accepted", "ongoing"].includes(j.status)
  ).slice(0, 3);

  const statCards = [
    {
      label: "Active Orders",
      value: stats?.activeOrders || 0,
      icon: Package,
      onClick: () => navigate("/customer/orders"),
      highlight: (stats?.activeOrders || 0) > 0,
    },
    {
      label: "Active Jobs",
      value: stats?.activeJobs || 0,
      icon: Briefcase,
      onClick: () => navigate("/customer/jobs"),
      highlight: (stats?.activeJobs || 0) > 0,
    },
    {
      label: "Saved Businesses",
      value: stats?.savedBusinesses || 0,
      icon: Heart,
      onClick: () => navigate("/customer/saved"),
    },
    {
      label: "Total Spent",
      value: `₦${(stats?.totalSpent || 0).toLocaleString()}`,
      icon: DollarSign,
    },
  ];

  const getOrderStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      confirmed: "default",
      processing: "default",
      shipped: "default",
      delivered: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getJobStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      requested: "secondary",
      quoted: "default",
      accepted: "default",
      ongoing: "default",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here's what's happening with your account
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
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
                  className={`stat-card ${stat.onClick ? "cursor-pointer hover:border-foreground/20" : ""} ${stat.highlight ? "border-foreground/30 bg-muted/50" : ""}`}
                  onClick={stat.onClick}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <Icon className={`h-4 w-4 ${stat.highlight ? "text-foreground" : "text-muted-foreground"}`} />
                  </div>
                  <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                  {stat.highlight && stat.onClick && (
                    <p className="text-xs text-muted-foreground mt-1">Tap to view</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Recent Orders */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-foreground">Recent Orders</h2>
              {orders.length > 0 && (
                <button 
                  onClick={() => navigate("/customer/orders")}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  View all
                </button>
              )}
            </div>
            {activeOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active orders
              </p>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
                    onClick={() => navigate("/customer/orders")}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {order.businesses?.company_name || "Order"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.order_number} • {format(new Date(order.created_at), "MMM d")}
                      </p>
                    </div>
                    {getOrderStatusBadge(order.status)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-foreground">Recent Jobs</h2>
              {jobs.length > 0 && (
                <button 
                  onClick={() => navigate("/customer/jobs")}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  View all
                </button>
              )}
            </div>
            {activeJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active job requests
              </p>
            ) : (
              <div className="space-y-3">
                {activeJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
                    onClick={() => navigate("/customer/jobs")}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {job.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {job.job_number} • {format(new Date(job.created_at), "MMM d")}
                      </p>
                    </div>
                    {getJobStatusBadge(job.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card">
          <h2 className="mb-4 font-medium text-foreground">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => navigate("/customer/discover")}
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent text-left"
            >
              <div className="rounded-lg bg-muted p-2">
                <Search className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Discover</p>
                <p className="text-sm text-muted-foreground">
                  Find products & services
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
