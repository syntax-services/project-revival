import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { extractCleanSnippet } from "@/lib/messageUtils";

export function useRealtimeMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Listen for any insert in the messages table
    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const msg = payload.new;

          // Ignore our own messages
          if (msg.sender_id === user.id) return;

          // Check if the message belongs to a conversation we are part of
          const { data: conv, error } = await supabase
            .from("conversations")
            .select("id, customer_id, business_id, businesses(company_name, user_id), profiles!conversations_customer_id_fkey(full_name)")
            .eq("id", msg.conversation_id)
            .maybeSingle();

          if (error || !conv) return;

          const isCustomer = conv.customer_id === user.id;
          const isBusiness = conv.businesses?.user_id === user.id;

          if (!isCustomer && !isBusiness) return;

          // Only alert if it's sent TO us
          // If we are the customer, the sender should be 'business'
          // If we are the business, the sender should be 'customer'
          if (isCustomer && msg.sender_type !== "business") return;
          if (isBusiness && msg.sender_type !== "customer") return;

          // Don't show toast if we are already actively on that exact conversation page
          const path = window.location.pathname;
          const query = new URLSearchParams(window.location.search);
          
          if (isCustomer) {
            if (path.includes("/customer/messages") && query.get("biz") === conv.business_id) return;
          } else if (isBusiness) {
            // Note: business side uses internal state, not URL query for selected conversation
            // But we can check if they are on messages page to avoid double notifications, though we can't easily check the selected state here.
            // For now, if they are on /business/messages, let's still show a minimal toast or skip if we assume they see it.
            // We'll show the toast anywhere for safety.
          }

          const senderName = isCustomer 
            ? (conv.businesses?.company_name || "Merchant")
            : (conv.profiles?.full_name || "Shopper");

          const cleanContent = extractCleanSnippet(msg.content, 40) || "Sent an attachment";

          // Request native browser notification
          if (Notification.permission === "granted") {
            try {
              new Notification(`New message from ${senderName}`, {
                body: cleanContent,
                icon: "/favicon.ico"
              });
            } catch (e) {
              console.warn("Native push failed:", e);
            }
          }

          // Show in-app toast
          toast(`New message from ${senderName}`, {
            description: cleanContent,
            action: {
              label: "Reply",
              onClick: () => {
                if (isCustomer) {
                  navigate(`/customer/messages?biz=${conv.business_id}`);
                } else {
                  navigate(`/business/messages`);
                }
              }
            },
          });
        }
      )
      .subscribe();

    // Ask for native notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);
}
