import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadCount() {
  const { user, resolvedUserType } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !resolvedUserType) return;

    let isMounted = true;

    const fetchUnreadCount = async () => {
      try {
        if (resolvedUserType === "business") {
          // Fetch business unread count using the existing RPC
          const { data: businessData } = await supabase
            .from("businesses")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (businessData?.id) {
            const { data: convs } = await supabase.rpc("get_business_conversations", {
              p_business_id: businessData.id,
            });
            if (isMounted && Array.isArray(convs)) {
              const totalUnread = convs.filter(c => (c.unread_count || 0) > 0).length;
              setUnreadCount(totalUnread);
            }
          }
        } else if (resolvedUserType === "customer") {
          // Fetch customer unread count using the existing RPC
          const { data: customerData } = await supabase
            .from("customers")
            .select("id")
            .eq("user_id", user.id)
            .single();

          if (customerData?.id) {
            const { data: convs } = await supabase.rpc("get_customer_conversations", {
              p_customer_id: customerData.id,
            });
            if (isMounted && Array.isArray(convs)) {
              const totalUnread = convs.filter(c => (c.unread_count || 0) > 0).length;
              setUnreadCount(totalUnread);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    fetchUnreadCount();

    // Subscribe to messages changes to update unread count
    const channel = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user, resolvedUserType]);

  return unreadCount;
}
