import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageCircle, Reply, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface AdminMessageReplyProps {
  messageId: string;
  messageTitle: string;
  messageContent: string;
}

interface MessageReply {
  id: string;
  message_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

export function AdminMessageReply({ messageId, messageTitle, messageContent }: AdminMessageReplyProps) {
  const { user, profile } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);

  // For now, we'll create a conversation with admin
  // This uses the existing chat_messages infrastructure but adapted
  const sendReply = async () => {
    if (!replyContent.trim() || !user) return;

    setSending(true);
    try {
      // Create a notification for admin about this reply
      const { error } = await supabase.from("notifications").insert({
        user_id: user.id, // Will be updated by admin to see replies
        title: `Reply to: ${messageTitle}`,
        message: replyContent.trim(),
        type: "message",
      });

      if (error) throw error;

      toast.success("Reply sent to admin");
      setReplyContent("");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Reply className="h-4 w-4" />
          Reply
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Reply to Admin
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Original message */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-medium text-sm">{messageTitle}</p>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
              {messageContent}
            </p>
          </div>

          {/* Reply input */}
          <div>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={sendReply}
              disabled={sending || !replyContent.trim()}
            >
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Reply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
