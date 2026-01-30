import React from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BottomNav } from "./BottomNav";
import { CartPopup } from "@/components/cart/CartPopup";
import { NotificationsPopup } from "@/components/notifications/NotificationsPopup";
import { useAuth } from "@/contexts/AuthContext";
import stringLogo from "@/assets/string-logo.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const isCustomer = profile?.user_type === "customer";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={stringLogo} alt="String" className="h-10 w-auto logo-adaptive" />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationsPopup />
          {isCustomer && <CartPopup />}
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="pb-safe-nav">
        <div className="container py-6 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
};