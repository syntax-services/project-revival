import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useBusinessReviewsWithDetails(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-reviews-details", businessId],
    queryFn: async () => {
      if (!businessId) return [];

      // First get reviews
      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!reviews || reviews.length === 0) return [];

      // Get reviewer profiles for customer names
      const reviewerIds = [...new Set(reviews.map(r => r.reviewer_id))];
      const { data: customers } = await supabase
        .from("customers")
        .select("id, user_id")
        .in("id", reviewerIds);

      const userIds = customers?.map(c => c.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Map profiles to customers
      const customerToName = new Map();
      customers?.forEach(c => {
        const profile = profiles?.find(p => p.user_id === c.user_id);
        if (profile) {
          customerToName.set(c.id, profile.full_name);
        }
      });

      return reviews.map(r => ({
        ...r,
        reviewer_name: customerToName.get(r.reviewer_id) || 'Anonymous',
      }));
    },
    enabled: !!businessId,
  });
}

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}

export function useServiceReviews(serviceId: string | undefined) {
  return useQuery({
    queryKey: ["service-reviews", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];

      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!serviceId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (review: {
      rating: number;
      title?: string;
      content?: string;
      business_id?: string;
      product_id?: string;
      service_id?: string;
      order_id?: string;
      job_id?: string;
      reviewer_id: string;
      reviewer_type: string;
      verified_purchase?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("reviews")
        .insert(review)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({ title: "Review submitted successfully" });
      if (variables.business_id) {
        queryClient.invalidateQueries({ queryKey: ["business-reviews-details", variables.business_id] });
      }
      if (variables.product_id) {
        queryClient.invalidateQueries({ queryKey: ["product-reviews", variables.product_id] });
      }
      if (variables.service_id) {
        queryClient.invalidateQueries({ queryKey: ["service-reviews", variables.service_id] });
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to submit review" });
    },
  });
}

export function useRespondToReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      const { error } = await supabase
        .from("reviews")
        .update({
          response,
          response_at: new Date().toISOString(),
        })
        .eq("id", reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Response posted" });
      queryClient.invalidateQueries({ queryKey: ["business-reviews-details"] });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to post response" });
    },
  });
}
