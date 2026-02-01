import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness, useBusinessStats } from "@/hooks/useBusiness";
import { MessageSquare, Package, Briefcase, Star, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export default function BusinessOverview() {
  const { profile } = useAuth();
  const { data: business, isLoading: businessLoading } = useBusiness();
  const { data: stats, isLoading: statsLoading } = useBusinessStats(business?.id);
  const navigate = useNavigate();

  const isLoading = businessLoading || statsLoading;

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
      label: "Total Revenue", 
      value: `₦${(stats?.totalRevenue || 0).toLocaleString()}`, 
      icon: DollarSign,
    },
    { 
      label: "Avg Rating", 
      value: stats?.avgRating ? stats.avgRating.toFixed(1) : "—", 
      icon: Star,
    },
    { 
      label: "Completed Orders", 
      value: stats?.completedOrders || 0, 
      icon: Package,
    },
    { 
      label: "Completed Jobs", 
      value: stats?.completedJobs || 0, 
      icon: Briefcase,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {business?.company_name ? `Managing ${business.company_name}` : "Here's your business performance overview"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
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
                  <p className={`text-2xl font-semibold ${stat.highlight ? "text-foreground" : "text-foreground"}`}>
                    {stat.value}
                  </p>
                  {stat.highlight && stat.onClick && (
                    <p className="text-xs text-muted-foreground mt-1">Tap to view</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!isLoading && business && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="dashboard-card">
              <h3 className="font-medium text-foreground mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => navigate("/business/products")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <Package className="inline h-4 w-4 mr-2" />
                  Manage Products
                </button>
                <button 
                  onClick={() => navigate("/business/services")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <Briefcase className="inline h-4 w-4 mr-2" />
                  Manage Services
                </button>
                <button 
                  onClick={() => navigate("/business/messages")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <MessageSquare className="inline h-4 w-4 mr-2" />
                  View Messages
                </button>
              </div>
            </div>

            <div className="dashboard-card">
              <h3 className="font-medium text-foreground mb-3">Business Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{business.business_type || "goods"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Industry</span>
                  <span className="font-medium">{business.industry || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verified</span>
                  <span className="font-medium">{business.verified ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}