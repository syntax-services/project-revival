import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AdminMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  recipient_type: 'all' | 'businesses' | 'customers' | 'specific';
  title: string;
  content: string;
  is_pinned: boolean;
  read_by: string[];
  created_at: string;
  updated_at: string;
}

interface MessageReply {
  id: string;
  message_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

export function useAdminMessages() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["admin-messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_messages")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdminMessage[];
    },
    enabled: !!user?.id,
  });

  // Get all messages (pinned and unpinned)
  const allMessages = messages;
  const pinnedMessages = messages.filter(m => m.is_pinned);
  const unpinnedMessages = messages.filter(m => !m.is_pinned);
  const unreadMessages = messages.filter(m => !m.read_by?.includes(user?.id || ''));

  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user?.id) return;
      
      const message = messages.find(m => m.id === messageId);
      if (!message || message.read_by?.includes(user.id)) return;

      const newReadBy = [...(message.read_by || []), user.id];
      
      const { error } = await supabase
        .from("admin_messages")
        .update({ read_by: newReadBy })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({
      title,
      content,
      recipientType,
      recipientId,
      isPinned,
    }: {
      title: string;
      content: string;
      recipientType: AdminMessage['recipient_type'];
      recipientId?: string;
      isPinned?: boolean;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase.from("admin_messages").insert({
        sender_id: user.id,
        recipient_id: recipientId || null,
        recipient_type: recipientType,
        title,
        content,
        is_pinned: isPinned || false,
        read_by: [],
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      toast.success("Message sent");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("admin_messages")
        .update({ is_pinned: isPinned })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      toast.success("Updated");
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("admin_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      toast.success("Message deleted");
    },
  });

  return {
    messages,
    allMessages,
    pinnedMessages,
    unpinnedMessages,
    unreadMessages,
    unreadCount: unreadMessages.length,
    isLoading,
    markAsRead,
    sendMessage,
    togglePin,
    deleteMessage,
  };
}

// Hook to fetch replies for a specific message
export function useMessageReplies(messageId: string | undefined) {
  return useQuery({
    queryKey: ["message-replies", messageId],
    queryFn: async () => {
      if (!messageId) return [];
      
      const { data, error } = await supabase
        .from("admin_message_replies")
        .select("*, profiles:sender_id (full_name, user_type)")
        .eq("message_id", messageId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!messageId,
  });
}

// Hook to send a reply to an admin message
export function useSendMessageReply() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      messageId,
      content,
    }: {
      messageId: string;
      content: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const senderType = profile?.user_type || 'customer';

      const { error } = await supabase.from("admin_message_replies").insert({
        message_id: messageId,
        sender_id: user.id,
        sender_type: senderType,
        content,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["message-replies", variables.messageId] });
      toast.success("Reply sent");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send reply");
    },
  });
}

// Admin hook to get all replies for monitoring
export function useAllMessageReplies() {
  return useQuery({
    queryKey: ["all-message-replies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_message_replies")
        .select("*, profiles:sender_id (full_name, email, user_type), admin_messages:message_id (title)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });
}
