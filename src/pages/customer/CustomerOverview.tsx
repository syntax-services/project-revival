import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Search, Heart, MessageSquare, Bell } from "lucide-react";

interface CustomerStats {
  savedBusinesses: number;
  activeRequests: number;
  unreadNotifications: number;
}

export default function CustomerOverview() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<CustomerStats>({
    savedBusinesses: 0,
    activeRequests: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Get customer ID
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (customer) {
          // Fetch saved businesses count
          const { count: savedCount } = await supabase
            .from("saved_businesses")
            .select("*", { count: "exact", head: true })
            .eq("customer_id", customer.id);

          // Fetch active requests count
          const { count: requestsCount } = await supabase
            .from("requests")
            .select("*", { count: "exact", head: true })
            .eq("customer_id", customer.id)
            .neq("status", "completed");

          setStats((prev) => ({
            ...prev,
            savedBusinesses: savedCount || 0,
            activeRequests: requestsCount || 0,
          }));
        }

        // Fetch unread notifications
        const { count: notifCount } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false);

        setStats((prev) => ({
          ...prev,
          unreadNotifications: notifCount || 0,
        }));
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const statCards = [
    {
      label: "Saved Businesses",
      value: stats.savedBusinesses,
      icon: Heart,
      color: "text-pink-500",
    },
    {
      label: "Active Requests",
      value: stats.activeRequests,
      icon: MessageSquare,
      color: "text-primary",
    },
    {
      label: "Unread Notifications",
      value: stats.unreadNotifications,
      icon: Bell,
      color: "text-warning",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here's what's happening with your account
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-2xl font-semibold text-foreground">
                  {loading ? "–" : stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card">
          <h2 className="mb-4 text-lg font-medium text-foreground">
            Quick Actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/customer/discover"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
            >
              <div className="rounded-lg bg-primary/10 p-2">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Discover</p>
                <p className="text-sm text-muted-foreground">
                  Find new businesses
                </p>
              </div>
            </a>
          </div>
        </div>

        {/* Preferences Summary */}
        <div className="dashboard-card">
          <h2 className="mb-4 text-lg font-medium text-foreground">
            Your Preferences
          </h2>
          <p className="text-sm text-muted-foreground">
            Your profile helps us match you with the right businesses. Visit your
            profile page to update your interests and preferences.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
