import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Users, MessageSquare, TrendingUp } from "lucide-react";

export default function BusinessOverview() {
  const { profile } = useAuth();

  const statCards = [
    { label: "Customer Reach", value: "0", icon: Users, color: "text-primary" },
    { label: "Active Leads", value: "0", icon: MessageSquare, color: "text-info" },
    { label: "Growth Rate", value: "–", icon: TrendingUp, color: "text-success" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-muted-foreground">Here's your business performance overview</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}