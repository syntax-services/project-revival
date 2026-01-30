import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "./useCustomer";
import { toast } from "sonner";

interface CartItem {
  id: string;
  customer_id: string;
  business_id: string;
  product_id: string | null;
  service_id: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  products?: {
    id: string;
    name: string;
    price: number | null;
    image_url: string | null;
  } | null;
  services?: {
    id: string;
    name: string;
    price_min: number | null;
    price_max: number | null;
  } | null;
  businesses?: {
    id: string;
    company_name: string;
  } | null;
}

export function useCart() {
  const { data: customer } = useCustomer();
  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ["cart", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          *,
          products:product_id (id, name, price, image_url),
          services:service_id (id, name, price_min, price_max),
          businesses:business_id (id, company_name)
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CartItem[];
    },
    enabled: !!customer?.id,
  });

  const addToCart = useMutation({
    mutationFn: async ({
      businessId,
      productId,
      serviceId,
      quantity = 1,
      notes,
    }: {
      businessId: string;
      productId?: string;
      serviceId?: string;
      quantity?: number;
      notes?: string;
    }) => {
      if (!customer?.id) throw new Error("Not logged in");
      if (!productId && !serviceId) throw new Error("Must specify product or service");

      // Check if item already exists
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("customer_id", customer.id)
        .eq("business_id", businessId)
        .eq(productId ? "product_id" : "service_id", productId || serviceId)
        .maybeSingle();

      if (existing) {
        // Update quantity
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new item
        const { error } = await supabase.from("cart_items").insert({
          customer_id: customer.id,
          business_id: businessId,
          product_id: productId || null,
          service_id: serviceId || null,
          quantity,
          notes: notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add to cart");
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity })
          .eq("id", itemId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const removeFromCart = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Removed from cart");
    },
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      if (!customer?.id) return;
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("customer_id", customer.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  // Group cart items by business
  const cartByBusiness = cartItems.reduce((acc, item) => {
    const businessId = item.business_id;
    if (!acc[businessId]) {
      acc[businessId] = {
        business: item.businesses,
        items: [],
        total: 0,
      };
    }
    acc[businessId].items.push(item);
    const price = item.products?.price || item.services?.price_min || 0;
    acc[businessId].total += price * item.quantity;
    return acc;
  }, {} as Record<string, { business: CartItem['businesses']; items: CartItem[]; total: number }>);

  const cartTotal = cartItems.reduce((sum, item) => {
    const price = item.products?.price || item.services?.price_min || 0;
    return sum + price * item.quantity;
  }, 0);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cartItems,
    cartByBusiness,
    cartTotal,
    cartCount,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
}
