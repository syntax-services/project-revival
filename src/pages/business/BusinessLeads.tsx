import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MessageSquare } from "lucide-react";

export default function BusinessLeads() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leads & Requests</h1>
          <p className="mt-1 text-muted-foreground">Manage incoming customer requests</p>
        </div>
        <div className="dashboard-card text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-medium text-foreground">No leads yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Customer requests will appear here</p>
        </div>
      </div>
    </DashboardLayout>
  );
}