import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Offer {
  id: string;
  user_id: string;
  user_type: string;
  offer_type: string;
  title: string;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  location: string | null;
  urgency: string | null;
  images: string[] | null;
  video_url: string | null;
  status: string;
  responses_count: number;
  created_at: string;
  updated_at: string;
}

interface CreateOfferInput {
  offer_type: "product" | "service" | "employment" | "collaboration";
  title: string;
  description?: string;
  budget_min?: number;
  budget_max?: number;
  location?: string;
  urgency?: "low" | "medium" | "high" | "urgent";
  images?: string[];
  video_url?: string;
}

export function useOffers() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Offer[];
    },
    enabled: !!user,
  });

  const { data: myOffers = [] } = useQuery({
    queryKey: ["my-offers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Offer[];
    },
    enabled: !!user,
  });

  const createOffer = useMutation({
    mutationFn: async (input: CreateOfferInput) => {
      if (!user || !profile) throw new Error("Not authenticated");

      const { error } = await supabase.from("offers").insert({
        user_id: user.id,
        user_type: profile.user_type,
        offer_type: input.offer_type,
        title: input.title,
        description: input.description || null,
        budget_min: input.budget_min || null,
        budget_max: input.budget_max || null,
        location: input.location || null,
        urgency: input.urgency || null,
        images: input.images || null,
        video_url: input.video_url || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["my-offers"] });
      toast.success("Request created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create request");
    },
  });

  const cancelOffer = useMutation({
    mutationFn: async (offerId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("offers")
        .update({ status: "cancelled" })
        .eq("id", offerId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["my-offers"] });
      toast.success("Request cancelled");
    },
  });

  return {
    offers,
    myOffers,
    isLoading,
    createOffer,
    cancelOffer,
  };
}
