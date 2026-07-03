import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BottomNav, customerNavItems, businessNavItems, adminNavItems } from "./BottomNav";
import { CartPopup } from "@/components/cart/CartPopup";
import { NotificationsPopup } from "@/components/notifications/NotificationsPopup";
import { useScrollVisibility } from "@/hooks/useScrollVisibility";
import { cn } from "@/lib/utils";
import stringLogoLight from "@/assets/string-logo-light.png";
import stringLogoDark from "@/assets/String-logo-dark.png";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, Plus, MessageSquare, ArrowRight, X, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playChatAlert } from "@/hooks/useAudioSignals";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Module-level global caches to persist page visual states across nested DashboardLayout unmounts and mounts
let globalPrevPageHtml = "";
let globalPrevPath = "";
const globalCachedTabsHtml: Record<string, string> = {};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const isNavVisible = useScrollVisibility();
  const { isEmailVerified, user, resolvedUserType, isAdmin, refreshProfile, hasBothRoles, switchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSwitchToAdmin = async () => {
    if (user?.id) {
      localStorage.setItem(`string_active_admin_mode_${user.id}`, "true");
    }
    await refreshProfile();
    toast.success("Switched to Admin Mode! 🛡️");
    navigate("/admin");
  };
  const [resending, setResending] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  const [simulatedBid, setSimulatedBid] = React.useState<{
    id: string;
    buyerName: string;
    itemName: string;
    quantity: number;
    price: number;
    timestamp: number;
  } | null>(null);

  // Sync incoming custom bids triggered from the Admin Sandbox Console
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "string_simulated_bid" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSimulatedBid(parsed);
          playChatAlert().catch(console.error);
        } catch (err) {
          console.error("Failed to parse simulated bid payload:", err);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const customerTabs = ["/customer", "/customer/discover", "/customer/messages", "/customer/profile"];
  const businessTabs = ["/business", "/business/discover", "/business/messages", "/business/profile"];

  const isCustomerTab = customerTabs.includes(location.pathname);
  const isBusinessTab = businessTabs.includes(location.pathname);
  const isDashboardTab = isCustomerTab || isBusinessTab;

  const [prevPageHtml, setPrevPageHtml] = React.useState<string>(globalPrevPageHtml);
  const [prevPage, setPrevPage] = React.useState<{ pathname: string; children: React.ReactNode } | null>(null);

  const prevChildrenRef = React.useRef<React.ReactNode>(children);
  const prevPathRef = React.useRef(location.pathname);

  // Monitor path changes to store previous page and capture visual static HTML snapshots globally
  React.useEffect(() => {
    const prevPath = prevPathRef.current;
    
    if (prevPath !== location.pathname) {
      const tabs = isCustomerTab ? customerTabs : businessTabs;
      const isTargetTab = tabs.includes(location.pathname);
      
      if (isTargetTab) {
        // Going backward or switching to a dashboard tab -> Reset back-peek cache
        globalPrevPageHtml = "";
        globalPrevPath = "";
        setPrevPageHtml("");
      } else {
        // Going forward/deeper to a sub-page -> Capture the previous page HTML snapshot globally
        const currentContainer = document.querySelector('.current-page-container');
        if (currentContainer) {
          globalPrevPageHtml = currentContainer.innerHTML;
          globalPrevPath = prevPath;
          setPrevPageHtml(globalPrevPageHtml);
        }
      }

      // 2. Capture dashboard tab HTML snapshot globally before navigating away
      const prevTabIdx = tabs.indexOf(prevPath);
      if (prevTabIdx !== -1) {
        const tabSlider = document.querySelector('.tab-slider');
        if (tabSlider) {
          const activeTabEl = tabSlider.children[prevTabIdx] as HTMLElement;
          if (activeTabEl) {
            globalCachedTabsHtml[prevPath] = activeTabEl.innerHTML;
          }
        }
      }

      setPrevPage({
        pathname: prevPath,
        children: prevChildrenRef.current
      });
      prevPathRef.current = location.pathname;
      prevChildrenRef.current = children;
    } else {
      prevChildrenRef.current = children;
    }
  }, [location.pathname, children, isCustomerTab]);

  // Proactive tab HTML caching: 500ms after a dashboard tab mounts or renders, capture its visual state
  React.useEffect(() => {
    if (isDashboardTab) {
      const timer = setTimeout(() => {
        const tabs = isCustomerTab ? customerTabs : businessTabs;
        const currentTabIdx = tabs.indexOf(location.pathname);
        if (currentTabIdx !== -1) {
          const tabSlider = document.querySelector('.tab-slider');
          if (tabSlider) {
            const activeTabEl = tabSlider.children[currentTabIdx] as HTMLElement;
            if (activeTabEl) {
              globalCachedTabsHtml[location.pathname] = activeTabEl.innerHTML;
            }
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, children, isDashboardTab, isCustomerTab]);

  // Clear previous page and HTML cache after transition ends
  React.useEffect(() => {
    if (prevPage) {
      const timer = setTimeout(() => {
        if (!(window as any).isSwipeGestureActive) {
          setPrevPage(null);
          setPrevPageHtml("");
        }
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [prevPage]);

  // Handle custom swipe event ends to clear prevPage Html
  React.useEffect(() => {
    const handleGestureChange = (e: Event) => {
      const active = (e as CustomEvent).detail?.active;
      if (!active) {
        setTimeout(() => {
          setPrevPage(null);
          setPrevPageHtml("");
        }, 250);
      }
    };
    window.addEventListener("swipe-gesture-change", handleGestureChange);
    return () => window.removeEventListener("swipe-gesture-change", handleGestureChange);
  }, []);

  const TabSkeleton = () => (
    <div className="w-full h-full space-y-6 animate-pulse p-4">
      <div className="h-10 w-2/3 bg-muted rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-28 bg-muted rounded-2xl" />
        <div className="h-28 bg-muted rounded-2xl" />
      </div>
      <div className="h-40 w-full bg-muted rounded-2xl" />
      <div className="h-20 w-full bg-muted rounded-2xl" />
    </div>
  );

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      <header
        className={cn(
          "dashboard-header fixed top-0 left-0 right-0 z-40 flex items-center justify-between transition-all duration-300 px-4 md:px-6 border-b border-border/10 bg-background/95 backdrop-blur-xl",
          isScrolled 
            ? "h-[3.25rem] shadow-[0_2px_15px_rgba(0,0,0,0.02)]" 
            : "h-16"
        )}
      >
        <Link to="/" viewTransition className="flex items-center gap-2">
          <img src={stringLogoLight} alt="String" className={cn("w-auto logo-light transition-all duration-300", isScrolled ? "h-[1.5rem]" : "h-[1.85rem] md:h-10")} />
          <img src={stringLogoDark} alt="String" className={cn("w-auto logo-dark transition-all duration-300", isScrolled ? "h-[1.5rem]" : "h-[1.85rem] md:h-10")} />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
          {desktopNavItems.map((item) => {
            const Icon = item.icon as React.ComponentType<{ className?: string; active?: boolean }>;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                viewTransition
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4 transition-transform duration-300" active={isActive} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && resolvedUserType !== "admin" && (
            <button
              onClick={handleSwitchToAdmin}
              className="h-8 px-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-1.5 hover:bg-red-500/20 transition-all duration-200 active:scale-95 shadow-sm shadow-red-500/10 shrink-0"
              title="Switch to Admin Console"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="hidden sm:inline">Admin Panel</span>
              <span className="sm:hidden">Admin</span>
            </button>
          )}
          {hasBothRoles && resolvedUserType !== "admin" && (
            <button
              onClick={async () => {
                const nextRole = resolvedUserType === "business" ? "customer" : "business";
                await switchRole(nextRole);
                navigate(nextRole === "business" ? "/business" : "/customer");
                toast.success(`Switched to ${nextRole === "business" ? "Merchant" : "Shopper"} View!`);
              }}
              className="h-8 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-primary/20 transition-all duration-200 active:scale-95 shadow-sm shadow-primary/10 shrink-0"
              title={resolvedUserType === "business" ? "Switch to Shopper View" : "Switch to Merchant View"}
            >
              <span>{resolvedUserType === "business" ? "🛒 Shopper Mode" : "🏪 Merchant Mode"}</span>
            </button>
          )}
          {resolvedUserType !== "admin" && (
            <Link
              to={resolvedUserType === "business" ? "/business/upload" : "/customer/offers"}
              className="h-10 w-10 rounded-full hover:bg-accent flex items-center justify-center transition-all duration-200 active:scale-95 text-foreground hover:text-primary shrink-0"
              title={resolvedUserType === "business" ? "Upload new listing" : "Create new request"}
            >
              <Plus className="h-5.5 w-5.5" strokeWidth={2.2} />
            </Link>
          )}
          <NotificationsPopup />
          {resolvedUserType === "customer" && <CartPopup />}
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* Portal for discover page search bars */}
      <div 
        id="search-bar-portal" 
        className={cn(
          "sticky z-30 bg-background/95 backdrop-blur-xl transition-all duration-300 border-b border-border/10 empty:hidden",
          isScrolled ? "top-[3.25rem]" : "top-16"
        )} 
      />

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
      <main className="pb-safe-nav relative min-h-[calc(100vh-4rem)]">
        {isDashboardTab ? (
          <div className="relative w-full overflow-hidden">
            <div 
              className="tab-slider flex w-full"
              style={{
                transform: `translateX(-${(isCustomerTab ? customerTabs : businessTabs).indexOf(location.pathname) * 100}%)`,
                transition: (window as any).isSwipeGestureActive ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {(isCustomerTab ? customerTabs : businessTabs).map((tabPath) => {
                const isCurrent = location.pathname === tabPath;
                return (
                  <div 
                    key={tabPath} 
                    className={cn(
                      "w-full shrink-0 min-h-[calc(100vh-8rem)]",
                      isCurrent && "animate-page-slide current-page-container"
                    )}
                    style={{ willChange: 'transform' }}
                  >
                    {isCurrent ? (
                      children
                    ) : globalCachedTabsHtml[tabPath] ? (
                      <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: globalCachedTabsHtml[tabPath] }} />
                    ) : (
                      <TabSkeleton />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden w-full min-h-[calc(100vh-4rem)]">
            {/* Previous Page (underneath) for back-peek */}
            {prevPageHtml && (
              <div 
                className="previous-page-container absolute inset-0 z-0 py-6 container pointer-events-none"
                style={{
                  opacity: 0,
                  transform: 'translateX(-20%) scale(0.95)',
                  willChange: 'transform, opacity',
                  overflow: 'hidden',
                  height: 'calc(100vh - 4rem)'
                }}
                dangerouslySetInnerHTML={{ __html: prevPageHtml }}
              />
            )}
            
            {/* Dark overlay for dimming */}
            {prevPageHtml && (
              <div 
                className="peek-overlay absolute inset-0 z-5 bg-black/35 pointer-events-none opacity-100 transition-opacity duration-300"
                style={{ willChange: 'opacity' }}
              />
            )}

            {/* Current Page (on top) */}
            <div 
              className="current-page-container relative z-10 py-6 container bg-background animate-page-slide shadow-[-8px_0_24px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_24px_rgba(0,0,0,0.35)]"
              style={{
                minHeight: 'calc(100vh - 4rem)',
                willChange: 'transform'
              }}
            >
              {children}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav - turns to capsule when scrolled */}
      <BottomNav isVisible={!isScrolled} />

      {/* Elegant Simulated Bid Alert Drawer/Card */}
      {simulatedBid && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-primary/30 bg-background/80 backdrop-blur-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] animate-in slide-in-from-bottom duration-300 text-foreground">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Incoming Custom Bid Offer 🔥</span>
              <h4 className="text-sm font-bold mt-0.5 truncate">{simulatedBid.buyerName}</h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                Offered <strong>₦{simulatedBid.price.toLocaleString()}</strong> for your custom request <strong>"{simulatedBid.itemName}"</strong>.
              </p>
            </div>
            <button
              onClick={() => setSimulatedBid(null)}
              className="text-muted-foreground hover:text-foreground shrink-0 rounded-full p-1 hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setSimulatedBid(null)}
              className="flex-1 rounded-xl border border-border h-9 text-xs font-semibold hover:bg-accent transition-colors"
            >
              Dismiss
            </button>
            <Link
              to={resolvedUserType === 'business' ? '/business/messages' : '/customer/messages'}
              onClick={() => setSimulatedBid(null)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-xs font-bold shadow-md shadow-primary/20 transition-all duration-300 active:scale-95"
            >
              View Bid Chat
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
