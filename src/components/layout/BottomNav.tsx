import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import {
  PremiumHome,
  PremiumDiscover,
  PremiumPlus,
  PremiumMessage,
  PremiumUser,
  PremiumStore,
} from "@/components/ui/custom-icons";
import { Settings, Shield, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const customerNavItems = [
  { href: "/customer", label: "Store", icon: PremiumStore },
  { href: "/customer/discover", label: "Discover", icon: Search },
  { href: "/customer/messages", label: "Inbox", icon: PremiumMessage, id: "messages" },
  { href: "/customer/profile", label: "Profile", icon: PremiumUser },
];

export const businessNavItems = [
  { href: "/business", label: "Store", icon: PremiumStore },
  { href: "/business/discover", label: "Discover", icon: Search },
  { href: "/business/messages", label: "Inbox", icon: PremiumMessage, id: "messages" },
  { href: "/business/profile", label: "Profile", icon: PremiumUser },
];

export const adminNavItems = [
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/string-admin", label: "Control", icon: Settings },
];

interface BottomNavProps {
  isVisible?: boolean;
}

export function BottomNav({ isVisible = true }: BottomNavProps) {
  const { resolvedUserType, profile } = useAuth();
  const location = useLocation();
  const unreadCount = useUnreadCount();

  const navItems =
    resolvedUserType === "admin"
      ? adminNavItems
      : resolvedUserType === "business"
        ? businessNavItems
        : customerNavItems;

  return (
    <nav
      className={cn(
        "bottom-nav md:hidden fixed z-50 transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] shadow-xl",
        isVisible
          ? "bottom-0 left-0 right-0 h-[4.75rem] border-t border-border/40 bg-background/80 backdrop-blur-xl safe-area-bottom shadow-black/5"
          : "bottom-5 left-1/2 -translate-x-1/2 w-[210px] h-[3.75rem] rounded-full border border-primary/20 bg-background/95 backdrop-blur-2xl shadow-primary/5 px-2 flex items-center"
      )}
    >
      <div 
        className={cn(
          "flex items-center mx-auto h-full transition-all duration-500 w-full",
          isVisible 
            ? "justify-around max-w-lg px-1" 
            : "justify-between px-3.5"
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon as React.ComponentType<{ className?: string; active?: boolean; strokeWidth?: number }>;
          const isActive = location.pathname === item.href;
          const isProfileTab = item.label === "Profile";
          const hasAvatar = isProfileTab && profile?.avatar_url;
          const showBadge = item.id === "messages" && unreadCount > 0;

          return (
            <Link
              key={item.href}
              to={item.href}
              viewTransition
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-300 active:scale-95 relative",
                isVisible ? "flex-1 py-2 px-1 gap-1.5" : "w-11 h-11 rounded-full hover:bg-accent/40"
              )}
            >
              {showBadge && (
                <span className="absolute top-1 right-2 lg:right-3 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white ring-2 ring-background z-10 animate-fade-in">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {hasAvatar ? (
                <div className={cn(
                  "rounded-full border overflow-hidden transition-all duration-300 bg-muted flex items-center justify-center shrink-0",
                  isActive ? "border-primary scale-105" : "border-border/40 hover:border-foreground",
                  isVisible ? "h-6 w-6" : "h-6 w-6"
                )}>
                  <img src={profile.avatar_url!} alt="Profile" className="h-full w-full object-cover" />
                </div>
              ) : (
                <Icon className={cn(
                  "transition-all duration-300",
                  isActive ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground",
                  isVisible ? "h-6 w-6" : "h-[1.45rem] w-[1.45rem]"
                )} active={isActive} strokeWidth={isVisible ? undefined : 2.6} />
              )}
              
              <span className={cn(
                "text-[10px] font-bold tracking-wide transition-all duration-300 origin-top leading-none overflow-hidden",
                isActive ? "text-primary" : "text-muted-foreground",
                isVisible 
                  ? "opacity-100 max-h-4 scale-100 mt-0" 
                  : "opacity-0 max-h-0 scale-0 -mt-1 pointer-events-none"
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
