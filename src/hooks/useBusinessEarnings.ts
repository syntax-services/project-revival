import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface WithdrawalRequest {
  id: string;
  business_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
}

export function useBusinessEarnings(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-earnings", businessId],
    queryFn: async () => {
      if (!businessId) return null;

      // Get completed orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, total, commission_amount, platform_fee")
        .eq("business_id", businessId)
        .eq("status", "delivered");

      // Get completed jobs
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, final_price")
        .eq("business_id", businessId)
        .eq("status", "completed");

      // Get business balance info
      const { data: business } = await supabase
        .from("businesses")
        .select("available_balance, pending_balance, total_withdrawn")
        .eq("id", businessId)
        .single();

      const totalOrderRevenue = (orders || []).reduce((sum, o) => sum + Number(o.total || 0), 0);
      const totalCommission = (orders || []).reduce((sum, o) => sum + Number(o.commission_amount || 0) + Number(o.platform_fee || 0), 0);
      const totalJobRevenue = (jobs || []).reduce((sum, j) => sum + Number(j.final_price || 0), 0);
      
      const grossRevenue = totalOrderRevenue + totalJobRevenue;
      const netRevenue = grossRevenue - totalCommission;

      return {
        grossRevenue,
        netRevenue,
        totalCommission,
        totalOrderRevenue,
        totalJobRevenue,
        orderCount: orders?.length || 0,
        jobCount: jobs?.length || 0,
        availableBalance: Number(business?.available_balance || netRevenue),
        pendingBalance: Number(business?.pending_balance || 0),
        totalWithdrawn: Number(business?.total_withdrawn || 0),
      };
    },
    enabled: !!businessId,
  });
}

export function useWithdrawalRequests(businessId: string | undefined) {
  return useQuery({
    queryKey: ["withdrawal-requests", businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WithdrawalRequest[];
    },
    enabled: !!businessId,
  });
}

export function useCreateWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      businessId,
      amount,
      bankName,
      accountNumber,
      accountName,
    }: {
      businessId: string;
      amount: number;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }) => {
      const { error } = await supabase.from("withdrawal_requests").insert({
        business_id: businessId,
        amount,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      toast.success("Withdrawal request submitted!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit withdrawal");
    },
  });
}

// Admin functions
export function useAllWithdrawals() {
  return useQuery({
    queryKey: ["all-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*, businesses:business_id (company_name, profiles:user_id (full_name, email))")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useProcessWithdrawal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      withdrawalId,
      status,
      adminNotes,
    }: {
      withdrawalId: string;
      status: "completed" | "rejected";
      adminNotes?: string;
    }) => {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status,
          admin_notes: adminNotes,
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq("id", withdrawalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      toast.success("Withdrawal processed");
    },
    onError: () => toast.error("Failed to process withdrawal"),
  });
}
