/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface AdminMessagesTabProps {
  adminMessages: any[];
  messageReplies: any[];
  liveMessages: any[];
  onNewMessage: () => void;
  refetchMessages: () => void;
}

export function AdminMessagesTab({
  adminMessages,
  messageReplies,
  liveMessages,
  onNewMessage,
  refetchMessages,
}: AdminMessagesTabProps) {
  // Toggle pin message mutation
  const togglePinMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("admin_messages")
        .update({ is_pinned: isPinned })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message pin status updated!");
      refetchMessages();
    },
    onError: (err: any) => {
      toast.error("Failed to pin message: " + err.message);
    }
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("admin_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message deleted successfully!");
      refetchMessages();
    },
    onError: (err: any) => {
      toast.error("Failed to delete message: " + err.message);
    }
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sent Messages ({adminMessages?.length || 0})</CardTitle>
                <CardDescription>Admin announcements</CardDescription>
              </div>
              <Button onClick={onNewMessage}>
                <Send className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {adminMessages?.map((message: any) => (
                  <div
                    key={message.id}
                    className={`p-3 border rounded-lg ${message.is_pinned ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {message.is_pinned && <Pin className="h-3 w-3 text-yellow-500" />}
                          <span className="font-medium text-sm">{message.title}</span>
                          <Badge variant="outline" className="text-xs">{message.recipient_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{message.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePinMutation.mutate({
                            messageId: message.id,
                            isPinned: !message.is_pinned,
                          })}
                        >
                          <Pin className={`h-3 w-3 ${message.is_pinned ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMessageMutation.mutate(message.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Replies from users */}
        <Card>
          <CardHeader>
            <CardTitle>User Replies ({messageReplies?.length || 0})</CardTitle>
            <CardDescription>Responses from businesses and customers</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {messageReplies?.map((reply: any) => (
                  <div key={reply.id} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={reply.sender_type === 'business' ? 'default' : 'secondary'}>
                        {reply.sender_type}
                      </Badge>
                      <span className="text-sm font-medium">{reply.profiles?.full_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Re: {reply.admin_messages?.title}
                    </p>
                    <p className="text-sm">{reply.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Platform User-to-User Live Chat Monitor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Platform Chat Monitor (Live Feed)
              </CardTitle>
              <CardDescription>
                Monitor real-time user-to-business communications on campus.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px] w-full">
            <div className="space-y-4 pr-4">
              {liveMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-xl">
                  No messages sent in this session yet.
                </div>
              ) : (
                liveMessages.map((msg: any) => {
                  const conversation = msg.conversations;
                  const shopperName = conversation?.customers?.profiles?.full_name || "Shopper";
                  const storeName = conversation?.businesses?.company_name || "Merchant";
                  const isFromStore = msg.sender_type === "business";

                  return (
                    <div
                      key={msg.id}
                      className="p-4 rounded-xl border border-border/40 bg-card hover:bg-muted/10 transition-colors space-y-2 text-left"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{shopperName}</span>
                          <span className="text-muted-foreground">↔</span>
                          <span className="font-semibold text-primary">{storeName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={isFromStore ? "default" : "secondary"}
                            className="text-[10px] font-bold"
                          >
                            {isFromStore ? "From Store" : "From Customer"}
                          </Badge>
                          <span className="text-muted-foreground font-mono">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/30 border border-border/20 text-sm text-foreground break-words font-medium">
                        {msg.content}
                      </div>

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.attachments.map((attachmentUrl: string, idx: number) => (
                            <a
                              key={idx}
                              href={attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2 py-1 rounded border border-primary/20"
                            >
                               Attachment {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
