import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: "customer" | "business";
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredUserType,
}) => {
  const { user, profile, loading } = useAuth();
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

  // If user has no profile or hasn't completed onboarding, redirect to onboarding
  if (!profile || !profile.onboarding_completed) {
    if (!location.pathname.startsWith("/onboarding")) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Check user type if required
  if (requiredUserType && profile && profile.user_type !== requiredUserType) {
    const redirectPath = profile.user_type === "business" ? "/business" : "/customer";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};
