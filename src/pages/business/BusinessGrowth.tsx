import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TrendingUp } from "lucide-react";

export default function BusinessGrowth() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Strategy & Growth</h1>
          <p className="mt-1 text-muted-foreground">Insights to grow your business</p>
        </div>
        <div className="dashboard-card text-center py-12">
          <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-medium text-foreground">Growth strategies coming soon</h3>
          <p className="mt-1 text-sm text-muted-foreground">Personalized recommendations will appear here</p>
        </div>
      </div>
    </DashboardLayout>
  );
}