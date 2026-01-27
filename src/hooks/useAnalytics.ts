import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, startOfMonth, subDays, format } from "date-fns";

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalJobs: number;
  avgOrderValue: number;
  avgRating: number;
  conversionRate: number;
  revenueByDay: Array<{ date: string; revenue: number }>;
  ordersByStatus: Record<string, number>;
  jobsByStatus: Record<string, number>;
  topProducts: Array<{ name: string; orders: number; revenue: number }>;
  topServices: Array<{ name: string; jobs: number; revenue: number }>;
  customerMetrics: {
    totalCustomers: number;
    repeatCustomers: number;
    avgJobsPerCustomer: number;
  };
}

export function useBusinessAnalytics(businessId: string | undefined, period: "week" | "month" | "all" = "month") {
  return useQuery({
    queryKey: ["business-analytics", businessId, period],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!businessId) throw new Error("No business ID");

      let startDate: Date | null = null;
      if (period === "week") {
        startDate = startOfWeek(new Date());
      } else if (period === "month") {
        startDate = startOfMonth(new Date());
      }

      // Fetch orders
      let ordersQuery = supabase
        .from("orders")
        .select("*")
        .eq("business_id", businessId);

      if (startDate) {
        ordersQuery = ordersQuery.gte("created_at", startDate.toISOString());
      }

      const { data: orders } = await ordersQuery;

      // Fetch jobs
      let jobsQuery = supabase
        .from("jobs")
        .select("*, services(name)")
        .eq("business_id", businessId);

      if (startDate) {
        jobsQuery = jobsQuery.gte("created_at", startDate.toISOString());
      }

      const { data: jobs } = await jobsQuery;

      // Fetch reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("business_id", businessId);

      // Fetch products for top products
      const { data: products } = await supabase
        .from("products")
        .select("id, name, total_orders")
        .eq("business_id", businessId)
        .order("total_orders", { ascending: false })
        .limit(5);

      // Fetch services for top services
      const { data: services } = await supabase
        .from("services")
        .select("id, name, total_jobs")
        .eq("business_id", businessId)
        .order("total_jobs", { ascending: false })
        .limit(5);

      const ordersList = orders || [];
      const jobsList = jobs || [];
      const reviewsList = reviews || [];

      // Calculate metrics
      const completedOrders = ordersList.filter((o) => o.status === "delivered");
      const completedJobs = jobsList.filter((j) => j.status === "completed");

      const orderRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const jobRevenue = completedJobs.reduce((sum, j) => sum + (Number(j.final_price) || 0), 0);
      const totalRevenue = orderRevenue + jobRevenue;

      const avgOrderValue = completedOrders.length > 0
        ? orderRevenue / completedOrders.length
        : 0;

      const avgRating = reviewsList.length > 0
        ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length
        : 0;

      // Revenue by day (last 7 days)
      const revenueByDay: Array<{ date: string; revenue: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, "yyyy-MM-dd");
        const displayStr = format(date, "MMM d");

        const dayOrderRevenue = ordersList
          .filter((o) => o.status === "delivered" && o.delivered_at?.startsWith(dateStr))
          .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

        const dayJobRevenue = jobsList
          .filter((j) => j.status === "completed" && j.completed_at?.startsWith(dateStr))
          .reduce((sum, j) => sum + (Number(j.final_price) || 0), 0);

        revenueByDay.push({ date: displayStr, revenue: dayOrderRevenue + dayJobRevenue });
      }

      // Orders by status
      const ordersByStatus: Record<string, number> = {};
      ordersList.forEach((o) => {
        ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
      });

      // Jobs by status
      const jobsByStatus: Record<string, number> = {};
      jobsList.forEach((j) => {
        jobsByStatus[j.status] = (jobsByStatus[j.status] || 0) + 1;
      });

      // Top products
      const topProducts = (products || []).map((p) => ({
        name: p.name,
        orders: p.total_orders || 0,
        revenue: 0, // Would need order items breakdown
      }));

      // Top services
      const topServices = (services || []).map((s) => ({
        name: s.name,
        jobs: s.total_jobs || 0,
        revenue: 0, // Would need job breakdown
      }));

      // Customer metrics
      const uniqueOrderCustomers = new Set(ordersList.map((o) => o.customer_id));
      const uniqueJobCustomers = new Set(jobsList.map((j) => j.customer_id));
      const allCustomers = new Set([...uniqueOrderCustomers, ...uniqueJobCustomers]);

      // Repeat customers (those with more than one order/job)
      const customerCounts: Record<string, number> = {};
      ordersList.forEach((o) => {
        customerCounts[o.customer_id] = (customerCounts[o.customer_id] || 0) + 1;
      });
      jobsList.forEach((j) => {
        customerCounts[j.customer_id] = (customerCounts[j.customer_id] || 0) + 1;
      });
      const repeatCustomers = Object.values(customerCounts).filter((c) => c > 1).length;

      const conversionRate = ordersList.length > 0
        ? (completedOrders.length / ordersList.length) * 100
        : 0;

      return {
        totalRevenue,
        totalOrders: ordersList.length,
        totalJobs: jobsList.length,
        avgOrderValue,
        avgRating,
        conversionRate,
        revenueByDay,
        ordersByStatus,
        jobsByStatus,
        topProducts,
        topServices,
        customerMetrics: {
          totalCustomers: allCustomers.size,
          repeatCustomers,
          avgJobsPerCustomer: allCustomers.size > 0
            ? (ordersList.length + jobsList.length) / allCustomers.size
            : 0,
        },
      };
    },
    enabled: !!businessId,
  });
}
