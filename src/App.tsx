import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Suspense, lazy, useEffect } from "react";

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  </div>
);

// Lazy load all pages
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Customer pages
const CustomerOverview = lazy(() => import("./pages/customer/CustomerOverview"));
const CustomerDiscover = lazy(() => import("./pages/customer/CustomerDiscover"));
const CustomerOrders = lazy(() => import("./pages/customer/CustomerOrders"));
const CustomerOffers = lazy(() => import("./pages/customer/CustomerOffers"));
const CustomerSavedBusinesses = lazy(() => import("./pages/customer/CustomerSavedBusinesses"));
const CustomerJobs = lazy(() => import("./pages/customer/CustomerJobs"));
const CustomerEngagement = lazy(() => import("./pages/customer/CustomerEngagement"));
const CustomerProfile = lazy(() => import("./pages/customer/CustomerProfile"));
const CustomerNotifications = lazy(() => import("./pages/customer/CustomerNotifications"));
const CustomerSettings = lazy(() => import("./pages/customer/CustomerSettings"));
const CustomerMessages = lazy(() => import("./pages/customer/CustomerMessages"));

// Business pages
const BusinessOverview = lazy(() => import("./pages/business/BusinessOverview"));
const BusinessInsights = lazy(() => import("./pages/business/BusinessInsights"));
const BusinessLeads = lazy(() => import("./pages/business/BusinessLeads"));
const BusinessProducts = lazy(() => import("./pages/business/BusinessProducts"));
const BusinessServices = lazy(() => import("./pages/business/BusinessServices"));
const BusinessOrders = lazy(() => import("./pages/business/BusinessOrders"));
const BusinessJobs = lazy(() => import("./pages/business/BusinessJobs"));
const BusinessProfile = lazy(() => import("./pages/business/BusinessProfile"));
const BusinessGrowth = lazy(() => import("./pages/business/BusinessGrowth"));
const BusinessSettings = lazy(() => import("./pages/business/BusinessSettings"));
const BusinessMessages = lazy(() => import("./pages/business/BusinessMessages"));
const BusinessPublicProfile = lazy(() => import("./pages/business/BusinessPublicProfile"));
const BusinessAnalytics = lazy(() => import("./pages/business/BusinessAnalytics"));
const BusinessReviews = lazy(() => import("./pages/business/BusinessReviews"));
const BusinessUpload = lazy(() => import("./pages/business/BusinessUpload"));
const BusinessDiscover = lazy(() => import("./pages/business/BusinessDiscover"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const StringAdmin = lazy(() => import("./pages/admin/StringAdmin"));

// Protected route component
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const queryClient = new QueryClient();

// Theme initialization component
function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

                {/* Customer Routes */}
                <Route path="/customer" element={<ProtectedRoute requiredUserType="customer"><CustomerOverview /></ProtectedRoute>} />
                <Route path="/customer/discover" element={<ProtectedRoute requiredUserType="customer"><CustomerDiscover /></ProtectedRoute>} />
                <Route path="/customer/orders" element={<ProtectedRoute requiredUserType="customer"><CustomerOrders /></ProtectedRoute>} />
                <Route path="/customer/offers" element={<ProtectedRoute requiredUserType="customer"><CustomerOffers /></ProtectedRoute>} />
                <Route path="/customer/saved" element={<ProtectedRoute requiredUserType="customer"><CustomerSavedBusinesses /></ProtectedRoute>} />
                <Route path="/customer/jobs" element={<ProtectedRoute requiredUserType="customer"><CustomerJobs /></ProtectedRoute>} />
                <Route path="/customer/engagement" element={<ProtectedRoute requiredUserType="customer"><CustomerEngagement /></ProtectedRoute>} />
                <Route path="/customer/profile" element={<ProtectedRoute requiredUserType="customer"><CustomerProfile /></ProtectedRoute>} />
                <Route path="/customer/notifications" element={<ProtectedRoute requiredUserType="customer"><CustomerNotifications /></ProtectedRoute>} />
                <Route path="/customer/settings" element={<ProtectedRoute requiredUserType="customer"><CustomerSettings /></ProtectedRoute>} />
                <Route path="/customer/messages" element={<ProtectedRoute requiredUserType="customer"><CustomerMessages /></ProtectedRoute>} />

                {/* Business Routes */}
                <Route path="/business" element={<ProtectedRoute requiredUserType="business"><BusinessOverview /></ProtectedRoute>} />
                <Route path="/business/insights" element={<ProtectedRoute requiredUserType="business"><BusinessInsights /></ProtectedRoute>} />
                <Route path="/business/leads" element={<ProtectedRoute requiredUserType="business"><BusinessLeads /></ProtectedRoute>} />
                <Route path="/business/products" element={<ProtectedRoute requiredUserType="business"><BusinessProducts /></ProtectedRoute>} />
                <Route path="/business/services" element={<ProtectedRoute requiredUserType="business"><BusinessServices /></ProtectedRoute>} />
                <Route path="/business/orders" element={<ProtectedRoute requiredUserType="business"><BusinessOrders /></ProtectedRoute>} />
                <Route path="/business/jobs" element={<ProtectedRoute requiredUserType="business"><BusinessJobs /></ProtectedRoute>} />
                <Route path="/business/profile" element={<ProtectedRoute requiredUserType="business"><BusinessProfile /></ProtectedRoute>} />
                <Route path="/business/growth" element={<ProtectedRoute requiredUserType="business"><BusinessGrowth /></ProtectedRoute>} />
                <Route path="/business/settings" element={<ProtectedRoute requiredUserType="business"><BusinessSettings /></ProtectedRoute>} />
                <Route path="/business/messages" element={<ProtectedRoute requiredUserType="business"><BusinessMessages /></ProtectedRoute>} />
                <Route path="/business/analytics" element={<ProtectedRoute requiredUserType="business"><BusinessAnalytics /></ProtectedRoute>} />
                <Route path="/business/reviews" element={<ProtectedRoute requiredUserType="business"><BusinessReviews /></ProtectedRoute>} />
                <Route path="/business/upload" element={<ProtectedRoute requiredUserType="business"><BusinessUpload /></ProtectedRoute>} />
                <Route path="/business/discover" element={<ProtectedRoute requiredUserType="business"><BusinessDiscover /></ProtectedRoute>} />
                
                {/* Public business profile - accessible to logged-in customers */}
                <Route path="/business/:id" element={<ProtectedRoute requiredUserType="customer"><BusinessPublicProfile /></ProtectedRoute>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                {/* Secret developer admin page - no public links */}
                <Route path="/string-admin" element={<ProtectedRoute><StringAdmin /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;