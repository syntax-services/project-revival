import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Suspense, useEffect } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { TermsGuard } from "@/components/auth/TermsGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import AuthLinks from "./pages/AuthLinks";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import Banned from "./pages/Banned";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { applyPalette } from "@/lib/theme";
import { GlobalMessageNotifier } from "@/components/common/GlobalMessageNotifier";

// Scroll Restoration helper with Discover position memory
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // If returning to discover, restore preserved scroll position
    if (pathname === "/customer/discover" || pathname === "/business/discover") {
      const savedPos = sessionStorage.getItem("string_discover_scroll_y");
      if (savedPos) {
        const scrollY = parseInt(savedPos, 10);
        if (!isNaN(scrollY) && scrollY > 0) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
            document.documentElement.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
            const mainContent = document.querySelector("main") || document.querySelector(".overflow-y-auto") || document.getElementById("main-scrollbar");
            if (mainContent) {
              mainContent.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
            }
          });
          return;
        }
      }
    }

    // Default scroll to top on other pages
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    const mainContent = document.querySelector("main") || document.querySelector(".overflow-y-auto") || document.getElementById("main-scrollbar");
    if (mainContent) {
      mainContent.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  </div>
);

// Customer core pages (Statically imported for instant, zero-delay tab switching)
import CustomerOverview from "./pages/customer/CustomerOverview";
import CustomerDiscover from "./pages/customer/CustomerDiscover";
import CustomerProfile from "./pages/customer/CustomerProfile";
import CustomerSettings from "./pages/customer/CustomerSettings";
import CustomerMessages from "./pages/customer/CustomerMessages";

const CustomerOrders = lazyWithRetry(() => import("./pages/customer/CustomerOrders"));
const CustomerOffers = lazyWithRetry(() => import("./pages/customer/CustomerOffers"));
const CustomerSavedBusinesses = lazyWithRetry(() => import("./pages/customer/CustomerSavedBusinesses"));
const CustomerJobs = lazyWithRetry(() => import("./pages/customer/CustomerJobs"));
const CustomerEngagement = lazyWithRetry(() => import("./pages/customer/CustomerEngagement"));
const CustomerNotifications = lazyWithRetry(() => import("./pages/customer/CustomerNotifications"));
const PaymentCallback = lazyWithRetry(() => import("./pages/customer/PaymentCallback"));
const Checkout = lazyWithRetry(() => import("./pages/customer/Checkout"));
const IDICDashboard = lazyWithRetry(() => import("./pages/customer/IDICDashboard"));


// Business core pages (Statically imported for instant, zero-delay tab switching)
import BusinessOverview from "./pages/business/BusinessOverview";
import BusinessDiscover from "./pages/business/BusinessDiscover";
import BusinessProfile from "./pages/business/BusinessProfile";
import BusinessSettings from "./pages/business/BusinessSettings";
import BusinessMessages from "./pages/business/BusinessMessages";
import BusinessJobs from "./pages/business/BusinessJobs";
import BusinessPayments from "./pages/business/BusinessPayments";
import BusinessGrowth from "./pages/business/BusinessGrowth";

const BusinessInsights = lazyWithRetry(() => import("./pages/business/BusinessInsights"));
const BusinessLeads = lazyWithRetry(() => import("./pages/business/BusinessLeads"));
const BusinessProducts = lazyWithRetry(() => import("./pages/business/BusinessProducts"));
const BusinessServices = lazyWithRetry(() => import("./pages/business/BusinessServices"));
const BusinessOrders = lazyWithRetry(() => import("./pages/business/BusinessOrders"));
const BusinessPublicProfile = lazyWithRetry(() => import("./pages/business/BusinessPublicProfile"));
const BusinessAnalytics = lazyWithRetry(() => import("./pages/business/BusinessAnalytics"));
const BusinessReviews = lazyWithRetry(() => import("./pages/business/BusinessReviews"));
const BusinessUpload = lazyWithRetry(() => import("./pages/business/BusinessUpload"));
const BusinessVerify = lazyWithRetry(() => import("./pages/business/BusinessVerify"));
const BusinessBoost = lazyWithRetry(() => import("./pages/business/BusinessBoost"));
const TikTokCallback = lazyWithRetry(() => import("./pages/business/TikTokCallback"));

// Discover product & service detail pages
const ProductDetailPage = lazyWithRetry(() => import("./pages/discover/ProductDetailPage"));
const ServiceDetailPage = lazyWithRetry(() => import("./pages/discover/ServiceDetailPage"));

// Admin pages
const StringAdmin = lazyWithRetry(() => import("./pages/admin/StringAdmin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Theme initialization component
function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);

    // Apply color palette
    const palette = localStorage.getItem("palette") || "blue";
    applyPalette(palette);
  }, []);

  return <>{children}</>;
}

function SwipeNavigation() {
  useSwipeNavigation();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <TermsGuard>
                  <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/links" element={<AuthLinks />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/refund-policy" element={<RefundPolicy />} />
                    <Route path="/shipping-policy" element={<ShippingPolicy />} />
                  <Route path="/banned" element={<Banned />} />

                  {/* Customer Routes */}
                  <Route path="/customer" element={<ProtectedRoute requiredUserType="customer"><CustomerDiscover /></ProtectedRoute>} />
                  <Route path="/customer/overview" element={<Navigate to="/customer" replace />} />
                  <Route path="/customer/discover" element={<Navigate to="/customer" replace />} />
                  <Route path="/customer/orders" element={<ProtectedRoute requiredUserType="customer"><CustomerOrders /></ProtectedRoute>} />
                  <Route path="/customer/checkout" element={<ProtectedRoute requiredUserType="customer"><Checkout /></ProtectedRoute>} />
                  <Route path="/customer/offers" element={<ProtectedRoute requiredUserType="customer"><CustomerOffers /></ProtectedRoute>} />
                  <Route path="/customer/saved" element={<ProtectedRoute requiredUserType="customer"><CustomerSavedBusinesses /></ProtectedRoute>} />
                  <Route path="/customer/jobs" element={<ProtectedRoute requiredUserType="customer"><CustomerJobs /></ProtectedRoute>} />
                  <Route path="/customer/engagement" element={<ProtectedRoute requiredUserType="customer"><CustomerEngagement /></ProtectedRoute>} />
                  <Route path="/customer/profile" element={<ProtectedRoute requiredUserType="customer"><CustomerProfile /></ProtectedRoute>} />
                  <Route path="/customer/notifications" element={<ProtectedRoute requiredUserType="customer"><CustomerNotifications /></ProtectedRoute>} />
                  <Route path="/customer/settings" element={<ProtectedRoute requiredUserType="customer"><CustomerSettings /></ProtectedRoute>} />
                  <Route path="/customer/messages" element={<ProtectedRoute requiredUserType="customer"><CustomerMessages /></ProtectedRoute>} />
                  <Route path="/payment-callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />
                  <Route path="/idic" element={<ProtectedRoute><IDICDashboard /></ProtectedRoute>} />

                  {/* Business Routes */}
                  <Route path="/business" element={<ProtectedRoute requiredUserType="business"><BusinessOverview /></ProtectedRoute>} />
                  <Route path="/business/overview" element={<Navigate to="/business" replace />} />
                  <Route path="/business/insights" element={<ProtectedRoute requiredUserType="business"><BusinessInsights /></ProtectedRoute>} />
                  <Route path="/business/leads" element={<ProtectedRoute requiredUserType="business"><BusinessLeads /></ProtectedRoute>} />
                  <Route path="/business/products" element={<ProtectedRoute requiredUserType="business"><BusinessProducts /></ProtectedRoute>} />
                  <Route path="/business/services" element={<ProtectedRoute requiredUserType="business"><BusinessServices /></ProtectedRoute>} />
                  <Route path="/business/orders" element={<ProtectedRoute requiredUserType="business"><BusinessOrders /></ProtectedRoute>} />
                  <Route path="/business/jobs" element={<ProtectedRoute requiredUserType="business"><BusinessJobs /></ProtectedRoute>} />
                  <Route path="/business/profile" element={<ProtectedRoute requiredUserType="business"><BusinessProfile /></ProtectedRoute>} />
                  <Route path="/business/payments" element={<ProtectedRoute requiredUserType="business"><BusinessPayments /></ProtectedRoute>} />
                  <Route path="/business/growth" element={<ProtectedRoute requiredUserType="business"><BusinessGrowth /></ProtectedRoute>} />
                  <Route path="/business/settings" element={<ProtectedRoute requiredUserType="business"><BusinessSettings /></ProtectedRoute>} />
                  <Route path="/business/messages" element={<ProtectedRoute requiredUserType="business"><BusinessMessages /></ProtectedRoute>} />
                  <Route path="/business/analytics" element={<ProtectedRoute requiredUserType="business"><BusinessAnalytics /></ProtectedRoute>} />
                  <Route path="/business/reviews" element={<ProtectedRoute requiredUserType="business"><BusinessReviews /></ProtectedRoute>} />
                  <Route path="/business/upload" element={<ProtectedRoute requiredUserType="business"><BusinessUpload /></ProtectedRoute>} />
                  <Route path="/business/discover" element={<ProtectedRoute requiredUserType="business"><BusinessDiscover /></ProtectedRoute>} />
                  <Route path="/business/verify" element={<ProtectedRoute requiredUserType="business"><BusinessVerify /></ProtectedRoute>} />
                  <Route path="/business/boost" element={<ProtectedRoute requiredUserType="business"><BusinessBoost /></ProtectedRoute>} />

                  {/* Public business profile - accessible for search indexing & guest previews */}
                  <Route path="/business/:id" element={<BusinessPublicProfile />} />

                  {/* Dedicated Product & Service Details Pages - Public for Google Indexing */}
                  <Route path="/product" element={<CustomerDiscover />} />
                  <Route path="/product/:id" element={<ProductDetailPage />} />
                  <Route path="/service/:id" element={<ServiceDetailPage />} />
                  <Route path="/customer/discover/product/:id" element={<ProductDetailPage />} />
                  <Route path="/business/discover/product/:id" element={<ProductDetailPage />} />

                  {/* TikTok Social Commerce OAuth Callback */}
                  <Route path="/callback" element={<TikTokCallback />} />

                  {/* Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requiredUserType="admin" allowAdminBootstrap>
                        <StringAdmin />
                      </ProtectedRoute>
                    }
                  />
                  {/* Secret developer admin page - no public links */}
                  <Route
                    path="/string-admin"
                    element={
                      <ProtectedRoute requiredUserType="admin" allowAdminBootstrap>
                        <StringAdmin />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
                  <Route path="/checkout" element={<Navigate to="/customer/checkout" replace />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
                <GlobalMessageNotifier />
              </TermsGuard>
            </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;


