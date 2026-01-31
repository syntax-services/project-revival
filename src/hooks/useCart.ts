import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "./useCustomer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";

const LOCAL_STORAGE_KEY = "string_cart_items";

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
    images?: string[] | null;
  } | null;
  businesses?: {
    id: string;
    company_name: string;
  } | null;
}

// Helper to get cart from localStorage
function getLocalCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Helper to save cart to localStorage
function saveLocalCart(items: CartItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
}

export function useCart() {
  const { user } = useAuth();
  const { data: customer } = useCustomer();
  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ["cart", customer?.id],
    queryFn: async () => {
      if (!customer?.id) {
        // Return local cart if no customer
        return getLocalCart();
      }
      
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          *,
          products:product_id (id, name, price, image_url),
          services:service_id (id, name, price_min, price_max, images),
          businesses:business_id (id, company_name)
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const items = data as CartItem[];
      // Sync to localStorage for persistence
      saveLocalCart(items);
      return items;
    },
    enabled: !!user,
    initialData: () => getLocalCart(),
  });

  // Sync local cart to database when customer becomes available
  useEffect(() => {
    const syncLocalToDb = async () => {
      if (!customer?.id) return;
      
      const localItems = getLocalCart();
      if (localItems.length === 0) return;

      // Check if items need to be synced (items with temporary IDs)
      const needsSync = localItems.some(item => item.id.startsWith("local_"));
      if (!needsSync) return;

      for (const item of localItems) {
        if (item.id.startsWith("local_")) {
          try {
            await supabase.from("cart_items").insert({
              customer_id: customer.id,
              business_id: item.business_id,
              product_id: item.product_id,
              service_id: item.service_id,
              quantity: item.quantity,
              notes: item.notes,
            });
          } catch {
            // Ignore sync errors
          }
        }
      }

      // Clear local storage and refetch
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    };

    syncLocalToDb();
  }, [customer?.id, queryClient]);

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
      if (!productId && !serviceId) throw new Error("Must specify product or service");

      // If no customer, store locally
      if (!customer?.id) {
        const localItems = getLocalCart();
        const existingIdx = localItems.findIndex(
          item => 
            item.business_id === businessId && 
            (productId ? item.product_id === productId : item.service_id === serviceId)
        );

        if (existingIdx >= 0) {
          localItems[existingIdx].quantity += quantity;
        } else {
          localItems.push({
            id: `local_${Date.now()}`,
            customer_id: "local",
            business_id: businessId,
            product_id: productId || null,
            service_id: serviceId || null,
            quantity,
            notes: notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        saveLocalCart(localItems);
        return;
      }

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
      // Handle local items
      if (itemId.startsWith("local_")) {
        const localItems = getLocalCart();
        if (quantity <= 0) {
          saveLocalCart(localItems.filter(item => item.id !== itemId));
        } else {
          const idx = localItems.findIndex(item => item.id === itemId);
          if (idx >= 0) {
            localItems[idx].quantity = quantity;
            saveLocalCart(localItems);
          }
        }
        return;
      }

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
      // Handle local items
      if (itemId.startsWith("local_")) {
        const localItems = getLocalCart();
        saveLocalCart(localItems.filter(item => item.id !== itemId));
        return;
      }

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
      // Clear local storage
      localStorage.removeItem(LOCAL_STORAGE_KEY);

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
