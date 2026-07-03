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

  if (!profile) {
    // Treat failed/null profile fetch as non-authorized (fail-closed)
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (profile.banned) {
    return <Navigate to="/banned" replace />;
  }

  // Non-admin flows require onboarding before accessing protected routes.
  // Decision on email verification: Enforced via a banner on DashboardLayout and strictly checked at
  // key business/checkout boundaries, rather than route-level blocking, to allow partial feature access.
  if (!profile.onboarding_completed && !isAdmin && !allowAdminBootstrap) {
    if (!location.pathname.startsWith("/onboarding") && !location.pathname.startsWith("/store/complete")) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  if (requiredUserType === "admin") {
    if (!isAdmin) {
      if (!allowAdminBootstrap) {
        return <Navigate to={dashboardPath} replace />;
      }
      // RATIONALE: We allow non-admins to reach the bootstrap route if allowAdminBootstrap is true.
      // This is solely to render the bootstrap key elevation screen. StringAdmin itself must enforce
      // that no admin data or controls are exposed until the user has successfully elevated their role.
    }
  } else if (requiredUserType) {
    // Admins can access ANY customer or business page freely — never redirect them
    if (isAdmin) {
      // Allow admins through regardless
    } else if (resolvedUserType && resolvedUserType !== requiredUserType) {
      if (location.pathname !== dashboardPath) {
        return <Navigate to={dashboardPath} replace />;
      }
    }
  }

  return <>{children}</>;
};
