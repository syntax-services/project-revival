import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Search,
  MessageCircle,
  User,
  Bell,
  Users,
  TrendingUp,
  Building2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const customerNavItems = [
  { href: "/customer", label: "Home", icon: LayoutDashboard },
  { href: "/customer/discover", label: "Discover", icon: Search },
  { href: "/customer/messages", label: "Messages", icon: MessageCircle },
  { href: "/customer/notifications", label: "Alerts", icon: Bell },
  { href: "/customer/settings", label: "Settings", icon: Settings },
];

const businessNavItems = [
  { href: "/business", label: "Home", icon: LayoutDashboard },
  { href: "/business/insights", label: "Insights", icon: Users },
  { href: "/business/messages", label: "Messages", icon: MessageCircle },
  { href: "/business/leads", label: "Leads", icon: TrendingUp },
  { href: "/business/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const { profile } = useAuth();
  const location = useLocation();

  const navItems = profile?.user_type === "business" ? businessNavItems : customerNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
