import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Search,
  MessageCircle,
  User,
  Plus,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const customerNavItems = [
  { href: "/customer", label: "Home", icon: Home },
  { href: "/customer/discover", label: "Discover", icon: Search },
  { href: "/customer/offers", label: "Requests", icon: Plus },
  { href: "/customer/messages", label: "Messages", icon: MessageCircle },
  { href: "/customer/profile", label: "Profile", icon: User },
];

const businessNavItems = [
  { href: "/business", label: "Home", icon: Home },
  { href: "/business/discover", label: "Discover", icon: Search },
  { href: "/business/upload", label: "Upload", icon: Plus },
  { href: "/business/messages", label: "Messages", icon: MessageCircle },
  { href: "/business/profile", label: "Profile", icon: User },
];

interface BottomNavProps {
  isVisible?: boolean;
}

export function BottomNav({ isVisible = true }: BottomNavProps) {
  const { profile } = useAuth();
  const location = useLocation();

  const navItems = profile?.user_type === "business" ? businessNavItems : customerNavItems;

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/98 backdrop-blur-md safe-area-bottom transition-transform duration-300",
        !isVisible && "translate-y-full"
      )}
    >
      <div className="flex items-center justify-around h-[4.5rem] px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-2xl transition-all duration-200",
                isActive
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-xl transition-all",
                isActive && "bg-foreground/10"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all",
                isActive && "font-semibold"
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
