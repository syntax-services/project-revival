import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "lucide-react";

export default function CustomerProfile() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
          <p className="mt-1 text-muted-foreground">Manage your personal information</p>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
              <User className="h-8 w-8 text-accent-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-foreground">{profile?.full_name}</h2>
              <p className="text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}