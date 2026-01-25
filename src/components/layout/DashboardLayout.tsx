import React from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BottomNav } from "./BottomNav";
import stringLogo from "@/assets/string-logo.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={stringLogo} alt="String" className="h-10 w-auto logo-adaptive" />
        </Link>
        <ThemeToggle />
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