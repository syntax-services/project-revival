import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

// Customer pages
import CustomerOverview from "./pages/customer/CustomerOverview";
import CustomerDiscover from "./pages/customer/CustomerDiscover";
import CustomerEngagement from "./pages/customer/CustomerEngagement";
import CustomerProfile from "./pages/customer/CustomerProfile";
import CustomerNotifications from "./pages/customer/CustomerNotifications";

// Business pages
import BusinessOverview from "./pages/business/BusinessOverview";
import BusinessInsights from "./pages/business/BusinessInsights";
import BusinessLeads from "./pages/business/BusinessLeads";
import BusinessProfile from "./pages/business/BusinessProfile";
import BusinessGrowth from "./pages/business/BusinessGrowth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            {/* Customer Routes */}
            <Route path="/customer" element={<ProtectedRoute requiredUserType="customer"><CustomerOverview /></ProtectedRoute>} />
            <Route path="/customer/discover" element={<ProtectedRoute requiredUserType="customer"><CustomerDiscover /></ProtectedRoute>} />
            <Route path="/customer/engagement" element={<ProtectedRoute requiredUserType="customer"><CustomerEngagement /></ProtectedRoute>} />
            <Route path="/customer/profile" element={<ProtectedRoute requiredUserType="customer"><CustomerProfile /></ProtectedRoute>} />
            <Route path="/customer/notifications" element={<ProtectedRoute requiredUserType="customer"><CustomerNotifications /></ProtectedRoute>} />

            {/* Business Routes */}
            <Route path="/business" element={<ProtectedRoute requiredUserType="business"><BusinessOverview /></ProtectedRoute>} />
            <Route path="/business/insights" element={<ProtectedRoute requiredUserType="business"><BusinessInsights /></ProtectedRoute>} />
            <Route path="/business/leads" element={<ProtectedRoute requiredUserType="business"><BusinessLeads /></ProtectedRoute>} />
            <Route path="/business/profile" element={<ProtectedRoute requiredUserType="business"><BusinessProfile /></ProtectedRoute>} />
            <Route path="/business/growth" element={<ProtectedRoute requiredUserType="business"><BusinessGrowth /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;