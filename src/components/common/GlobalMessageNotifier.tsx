import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";

export function GlobalMessageNotifier() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Check Notification permission
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
    
    audioRef.current = new Audio("https://actions.google.com/sounds/v1/communication/pop_up_short.ogg");
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // If the message is from ourselves, do nothing
          if (newMessage.sender_id === user.id) return;

          // Only notify if we are the intended recipient in the conversation
          // First we need to check if the conversation includes the current user
          const { data: convData } = await supabase
            .from("conversations")
            .select("customer_id, business_id")
            .eq("id", newMessage.conversation_id)
            .single();

          if (!convData) return;

          // Fetch user's profiles to check if they match the conversation participants
          const { data: customer } = await supabase.from("customers").select("id").eq("user_id", user.id).single();
          const { data: business } = await supabase.from("businesses").select("id").eq("user_id", user.id).single();

          const isParticipant = (customer && customer.id === convData.customer_id) || (business && business.id === convData.business_id);
          if (!isParticipant) return;

          // Don't show toast if we are currently looking at this conversation
          const isViewingConversation = 
            (location.pathname === "/customer/messages" || location.pathname === "/business/messages") &&
            new URLSearchParams(location.search).get("chat") === newMessage.conversation_id;

          if (isViewingConversation) return;

          // Play sound
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed:", e));
          }

          // Show in-app toast
          toast.success("New Message Received", {
            description: newMessage.content ? (newMessage.content.length > 30 ? newMessage.content.substring(0, 30) + '...' : newMessage.content) : "Sent an image/file",
            action: {
              label: "View",
              onClick: () => {
                const targetPath = business && business.id === convData.business_id ? "/business/messages" : "/customer/messages";
                navigate(`${targetPath}?chat=${newMessage.conversation_id}`);
              }
            }
          });

          // Show OS Notification if granted
          if ("Notification" in window && Notification.permission === "granted") {
            // Check if page is hidden
            if (document.hidden) {
              const notification = new Notification("New Message on String", {
                body: newMessage.content || "You received a new message",
                icon: "/favicon.ico",
              });
              notification.onclick = () => {
                window.focus();
                const targetPath = business && business.id === convData.business_id ? "/business/messages" : "/customer/messages";
                navigate(`${targetPath}?chat=${newMessage.conversation_id}`);
              };
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, location.pathname, location.search, navigate]);

  return null;
}
