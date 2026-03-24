import React from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BottomNav, customerNavItems, businessNavItems, adminNavItems } from "./BottomNav";
import { useLocation } from "react-router-dom";
import { CartPopup } from "@/components/cart/CartPopup";
import { NotificationsPopup } from "@/components/notifications/NotificationsPopup";
import { useScrollVisibility } from "@/hooks/useScrollVisibility";
import { cn } from "@/lib/utils";
import stringLogo from "@/assets/string-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const isNavVisible = useScrollVisibility();
  const { isEmailVerified, user, resolvedUserType } = useAuth();
  const location = useLocation();
  const [resending, setResending] = React.useState(false);

  const desktopNavItems =
    resolvedUserType === "admin"
      ? adminNavItems
      : resolvedUserType === "business"
        ? businessNavItems
        : customerNavItems;

  const resendVerification = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      if (error) throw error;
      toast.success("Verification email sent!");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to resend verification email";
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - hides on scroll down, shows on scroll up */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 md:px-6 transition-transform duration-300",
          !isNavVisible && "-translate-y-full"
        )}
      >
        <Link to="/" className="flex items-center gap-2">
          <img src={stringLogo} alt="String" className="h-10 w-auto logo-adaptive" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <NotificationsPopup />
          {resolvedUserType === "customer" && <CartPopup />}
          <ThemeToggle />
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* Email Verification Banner */}
      {!isEmailVerified && user && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">Please verify your email to enable all features.</p>
          </div>
          <button
            onClick={resendVerification}
            disabled={resending}
            className="text-xs font-semibold text-destructive underline hover:no-underline disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend email"}
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="pb-safe-nav">
        <div className="container py-6 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Bottom Nav - hides on scroll down, shows on scroll up */}
      <BottomNav isVisible={isNavVisible} />
    </div>
  );
};
