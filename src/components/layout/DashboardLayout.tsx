import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BottomNav } from "./BottomNav";
import {
  LayoutDashboard,
  Search,
  MessageCircle,
  User,
  Bell,
  Users,
  TrendingUp,
  Building2,
  LogOut,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import stringLogo from "@/assets/string-logo.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const customerNavItems = [
  { href: "/customer", label: "Overview", icon: LayoutDashboard },
  { href: "/customer/discover", label: "Discover", icon: Search },
  { href: "/customer/messages", label: "Messages", icon: MessageCircle },
  { href: "/customer/engagement", label: "Engagement", icon: User },
  { href: "/customer/notifications", label: "Notifications", icon: Bell },
  { href: "/customer/settings", label: "Settings", icon: Settings },
];

const businessNavItems = [
  { href: "/business", label: "Overview", icon: LayoutDashboard },
  { href: "/business/insights", label: "Customer Insights", icon: Users },
  { href: "/business/messages", label: "Messages", icon: MessageCircle },
  { href: "/business/leads", label: "Leads & Requests", icon: TrendingUp },
  { href: "/business/profile", label: "Business Profile", icon: Building2 },
  { href: "/business/settings", label: "Settings", icon: Settings },
];

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = profile?.user_type === "business" ? businessNavItems : customerNavItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <img src={stringLogo} alt="String" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop only */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-in-out lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={stringLogo} alt="String" className="h-8 w-auto" />
            </Link>
            <ThemeToggle />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-thin">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    isActive ? "nav-item-active" : "nav-item"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-sidebar-border p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-sm font-medium text-sidebar-accent-foreground">
                  {profile?.full_name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {profile?.full_name || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile?.user_type === "business" ? "Business" : "Customer"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 pb-20 lg:pb-0">
        <div className="container py-6 lg:py-8 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Bottom Nav - Mobile only */}
      <BottomNav />
    </div>
  );
};
