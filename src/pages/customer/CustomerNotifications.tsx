import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Bell } from "lucide-react";

export default function CustomerNotifications() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          <p className="mt-1 text-muted-foreground">Stay updated on your activity</p>
        </div>
        <div className="dashboard-card text-center py-12">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-medium text-foreground">No notifications yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">You're all caught up!</p>
        </div>
      </div>
    </DashboardLayout>
  );
}