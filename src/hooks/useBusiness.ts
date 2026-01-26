import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBusiness() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useBusinessOrders(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-orders", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}

export function useBusinessJobs(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-jobs", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from("jobs")
        .select("*, services(name)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}

export function useBusinessServices(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-services", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}

export function useBusinessProducts(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-products", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}

export function useBusinessReviews(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-reviews", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
}

export function useBusinessStats(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-stats", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      
      const [ordersRes, jobsRes, reviewsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, status, total", { count: "exact" })
          .eq("business_id", businessId),
        supabase
          .from("jobs")
          .select("id, status, final_price", { count: "exact" })
          .eq("business_id", businessId),
        supabase
          .from("reviews")
          .select("rating", { count: "exact" })
          .eq("business_id", businessId),
      ]);

      const orders = ordersRes.data || [];
      const jobs = jobsRes.data || [];
      const reviews = reviewsRes.data || [];

      const pendingOrders = orders.filter(o => o.status === "pending").length;
      const pendingJobs = jobs.filter(j => j.status === "requested" || j.status === "quoted").length;
      const completedOrders = orders.filter(o => o.status === "delivered").length;
      const completedJobs = jobs.filter(j => j.status === "completed").length;
      
      const totalRevenue = orders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0) +
        jobs
        .filter(j => j.status === "completed")
        .reduce((sum, j) => sum + (Number(j.final_price) || 0), 0);

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      return {
        totalOrders: orders.length,
        totalJobs: jobs.length,
        pendingOrders,
        pendingJobs,
        completedOrders,
        completedJobs,
        totalRevenue,
        totalReviews: reviews.length,
        avgRating,
      };
    },
    enabled: !!businessId,
  });
}
