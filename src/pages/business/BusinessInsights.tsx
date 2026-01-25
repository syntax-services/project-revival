import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BarChart3 } from "lucide-react";

export default function BusinessInsights() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customer Insights</h1>
          <p className="mt-1 text-muted-foreground">Understand your customer demographics</p>
        </div>
        <div className="dashboard-card text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-medium text-foreground">Insights coming soon</h3>
          <p className="mt-1 text-sm text-muted-foreground">Customer analytics will appear as you grow</p>
        </div>
      </div>
    </DashboardLayout>
  );
}