import React from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BottomNav } from "./BottomNav";
import { CartPopup } from "@/components/cart/CartPopup";
import { NotificationsPopup } from "@/components/notifications/NotificationsPopup";
import { useScrollVisibility } from "@/hooks/useScrollVisibility";
import { cn } from "@/lib/utils";
import stringLogo from "@/assets/string-logo.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const isNavVisible = useScrollVisibility();

  return (
    <div className="min-h-screen bg-background">
      {/* Header - hides on scroll down, shows on scroll up */}
      <header 
        className={cn(
          "fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 transition-transform duration-300",
          !isNavVisible && "-translate-y-full"
        )}
      >
        <Link to="/" className="flex items-center gap-2">
          <img src={stringLogo} alt="String" className="h-10 w-auto logo-adaptive" />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationsPopup />
          <CartPopup />
          <ThemeToggle />
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16" />

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
