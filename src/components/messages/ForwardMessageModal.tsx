import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Forward, Search, Store, User, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageData } from "@/components/messages/ChatMessageBubble";

interface ConversationTarget {
  id: string;
  name: string;
  logo_url?: string | null;
  verified?: boolean;
}

interface ForwardMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageToForward: MessageData | null;
  conversations: ConversationTarget[];
  onConfirmForward: (targetConvId: string, message: MessageData) => Promise<void>;
}

export function ForwardMessageModal({
  open,
  onOpenChange,
  messageToForward,
  conversations,
  onConfirmForward,
}: ForwardMessageModalProps) {
  const [search, setSearch] = useState("");
  const [forwardingId, setForwardingId] = useState<string | null>(null);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    return conversations.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase().trim())
    );
  }, [conversations, search]);

  const handleForward = async (targetId: string) => {
    if (!messageToForward) return;
    setForwardingId(targetId);
    try {
      await onConfirmForward(targetId, messageToForward);
      onOpenChange(false);
    } catch (err) {
      console.error("Forward failed:", err);
    } finally {
      setForwardingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-5 bg-card border border-border/30 shadow-2xl text-left">
        <DialogHeader className="space-y-1 text-left pb-2 border-b border-border/20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Forward className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-black text-foreground">
              Forward Message
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {messageToForward?.content.startsWith("[IMAGE]:")
              ? "Photo attachment"
              : messageToForward?.content.startsWith("[AUDIO_NOTE]:")
                ? "Voice note"
                : messageToForward?.content || "Message"}
          </p>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="pl-8 h-9 text-xs rounded-xl bg-muted/40 border-border/30"
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1.5 py-1">
          {filteredConversations.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              No conversations found
            </p>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center justify-between p-2 rounded-2xl hover:bg-muted/40 transition-colors border border-transparent hover:border-border/20"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 border border-border/20">
                    {conv.logo_url ? (
                      <img
                        src={conv.logo_url}
                        alt={conv.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {conv.name}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  type="button"
                  onClick={() => handleForward(conv.id)}
                  disabled={forwardingId === conv.id}
                  className="rounded-xl h-8 px-3 text-xs font-bold shrink-0 ml-2"
                >
                  {forwardingId === conv.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
