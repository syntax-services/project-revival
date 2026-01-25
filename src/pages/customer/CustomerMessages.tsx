import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, ArrowLeft, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Conversation {
  id: string;
  business_id: string;
  business_name: string;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  content: string;
  sender_type: "customer" | "business";
  created_at: string;
  read: boolean;
}

export default function CustomerMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCustomerId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setCustomerId(data.id);
    };
    fetchCustomerId();
  }, [user]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!customerId) return;

      const { data: convs } = await supabase
        .from("conversations")
        .select(`
          id,
          business_id,
          updated_at
        `)
        .eq("customer_id", customerId)
        .order("updated_at", { ascending: false });

      if (convs) {
        // Fetch business names and last messages
        const enriched = await Promise.all(
          convs.map(async (conv) => {
            const { data: business } = await supabase
              .from("businesses")
              .select("company_name")
              .eq("id", conv.business_id)
              .single();

            const { data: lastMsg } = await supabase
              .from("chat_messages")
              .select("content, created_at")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const { count } = await supabase
              .from("chat_messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .eq("sender_type", "business")
              .eq("read", false);

            return {
              id: conv.id,
              business_id: conv.business_id,
              business_name: business?.company_name || "Unknown",
              last_message: lastMsg?.content || null,
              last_message_at: lastMsg?.created_at || conv.updated_at,
              unread_count: count || 0,
            };
          })
        );

        setConversations(enriched);
      }
      setLoading(false);
    };

    fetchConversations();
  }, [customerId]);

  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data as Message[]);
        
        // Mark messages as read
        await supabase
          .from("chat_messages")
          .update({ read: true })
          .eq("conversation_id", selectedConversation.id)
          .eq("sender_type", "business");
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !customerId) return;

    setSending(true);
    try {
      await supabase.from("chat_messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: customerId,
        sender_type: "customer",
        content: newMessage.trim(),
      });

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);

      setNewMessage("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to send",
        description: "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          {selectedConversation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConversation(null)}
              className="lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Messages</h1>
            {!selectedConversation && (
              <p className="mt-1 text-muted-foreground">
                Chat with businesses
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden rounded-lg border border-border bg-card">
          {/* Conversation List */}
          <div
            className={cn(
              "w-full lg:w-80 border-r border-border",
              selectedConversation && "hidden lg:block"
            )}
          >
            <ScrollArea className="h-full">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse space-y-2">
                      <div className="h-4 w-2/3 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No conversations yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start a chat from a business profile
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-surface-hover transition-colors",
                        selectedConversation?.id === conv.id && "bg-surface-hover"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground truncate">
                              {conv.business_name}
                            </span>
                            {conv.unread_count > 0 && (
                              <span className="h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          {conv.last_message && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.last_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Message Thread */}
          <div
            className={cn(
              "flex-1 flex flex-col",
              !selectedConversation && "hidden lg:flex"
            )}
          >
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-border">
                  <h2 className="font-medium text-foreground">
                    {selectedConversation.business_name}
                  </h2>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.sender_type === "customer" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2",
                            msg.sender_type === "customer"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          )}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-1",
                              msg.sender_type === "customer"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {format(new Date(msg.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="google-input flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      size="icon"
                      className="flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Select a conversation to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
