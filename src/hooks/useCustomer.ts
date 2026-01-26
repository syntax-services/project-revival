import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCustomer() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["customer", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCustomerOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-orders", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("*, businesses(company_name, cover_image_url)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });
}

export function useCustomerJobs(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-jobs", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from("jobs")
        .select("*, businesses(company_name, cover_image_url), services(name)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });
}

export function useSavedBusinesses(customerId: string | undefined) {
  return useQuery({
    queryKey: ["saved-businesses", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from("saved_businesses")
        .select("*, businesses(id, company_name, cover_image_url, industry, business_type, reputation_score)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
  });
}

export function useCustomerStats(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-stats", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      
      const [ordersRes, jobsRes, savedRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, status, total", { count: "exact" })
          .eq("customer_id", customerId),
        supabase
          .from("jobs")
          .select("id, status", { count: "exact" })
          .eq("customer_id", customerId),
        supabase
          .from("saved_businesses")
          .select("id", { count: "exact" })
          .eq("customer_id", customerId),
      ]);

      const orders = ordersRes.data || [];
      const jobs = jobsRes.data || [];
      const saved = savedRes.data || [];

      const activeOrders = orders.filter(o => 
        ["pending", "confirmed", "processing", "shipped"].includes(o.status)
      ).length;
      
      const activeJobs = jobs.filter(j => 
        ["requested", "quoted", "accepted", "ongoing"].includes(j.status)
      ).length;

      const totalSpent = orders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      return {
        totalOrders: orders.length,
        totalJobs: jobs.length,
        activeOrders,
        activeJobs,
        savedBusinesses: saved.length,
        totalSpent,
      };
    },
    enabled: !!customerId,
  });
}
