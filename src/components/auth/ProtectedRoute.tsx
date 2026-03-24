import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: "customer" | "business" | "admin";
  allowAdminBootstrap?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredUserType,
  allowAdminBootstrap = false,
}) => {
  const { user, profile, loading, dashboardPath, isAdmin, resolvedUserType } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Non-admin flows require onboarding before accessing protected routes
  if ((!profile || !profile.onboarding_completed) && !isAdmin && !allowAdminBootstrap) {
    if (!location.pathname.startsWith("/onboarding")) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  if (requiredUserType === "admin") {
    if (allowAdminBootstrap) {
      return <>{children}</>;
    }

    if (!isAdmin && location.pathname !== dashboardPath) {
      return <Navigate to={dashboardPath} replace />;
    }
  } else if (requiredUserType && resolvedUserType && resolvedUserType !== requiredUserType) {
    if (location.pathname !== dashboardPath) {
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return <>{children}</>;
};
