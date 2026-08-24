import { useEffect, useState, useRef, useMemo } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, Send, ArrowLeft, Plus, Mic, 
  Square, Image as ImageIcon, MoreVertical, 
  ChevronLeft, ShieldCheck, User, Loader2,
  X, Reply, Forward
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { playChatAlert } from "@/hooks/useAudioSignals";
import { ChatMessageBubble, MessageData } from "@/components/messages/ChatMessageBubble";
import { ChatConversationItem } from "@/components/messages/ChatConversationItem";
import { ForwardMessageModal } from "@/components/messages/ForwardMessageModal";
import { getMaskedAssetUrl } from "@/lib/assetMask";
import { parseVoiceNoteFromClipboard } from "@/lib/clipboardMedia";
import { extractCleanSnippet } from "@/lib/messageUtils";
import { format, isToday, isYesterday } from "date-fns";

interface Conversation {
  id: string;
  customer_id: string;
  customer_name: string;
  avatar_url?: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  verification_level?: number;
}

export default function BusinessMessages() {
  usePageMeta({
    title: "Customer Inquiries & Sales Chats",
    description: "Chat directly with interested buyers, negotiate prices, and send custom invoices in real time.",
    keywords: ["customer chat","sales inquiries","direct messaging"],
    });

  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  // Reply & Forward States
  const [replyingTo, setReplyingTo] = useState<MessageData | null>(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<MessageData | null>(null);

  // Dynamic Floating Date Pill state
  const [floatingDate, setFloatingDate] = useState<string>("Today");
  const [showFloatingDate, setShowFloatingDate] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<any>(null);

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordedMime = mediaRecorder.mimeType || "audio/webm";
        const fileExt = recordedMime.includes("mp4") || recordedMime.includes("aac")
          ? "mp4"
          : recordedMime.includes("ogg")
            ? "ogg"
            : "webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedMime });
        setSending(true);
        try {
          const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(fileName, audioBlob, { contentType: recordedMime });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);
          const audioUrl = data.publicUrl;

          if (selectedConversation && user?.id) {
            await supabase.from("messages").insert({
              conversation_id: selectedConversation.id,
              sender_id: user.id,
              sender_type: "business",
              content: `[AUDIO_NOTE]:${audioUrl}`,
            });

            await supabase
              .from("conversations")
              .update({
                last_message: "Voice note",
                last_message_at: new Date().toISOString(),
              })
              .eq("id", selectedConversation.id);
          }
        } catch (err: any) {
          toast({
            variant: "destructive",
            title: "Voice note failed",
            description: err.message || "Failed to upload voice note.",
          });
        } finally {
          setSending(false);
          setIsRecording(false);
          setRecordingDuration(0);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Microphone Access Denied",
        description: "Please allow microphone permissions to record audio.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      clearInterval(recordingTimerRef.current);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !user?.id) return;

    setSending(true);
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);
      const imageUrl = data.publicUrl;

      await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_type: "business",
        content: `[IMAGE]:${imageUrl}`,
      });

      await supabase
        .from("conversations")
        .update({
          last_message: "Photo attachment",
          last_message_at: new Date().toISOString(),
        })
        .eq("id", selectedConversation.id);

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Image Upload Failed",
        description: err.message || "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    // 1. Check for Voice Note payload (Zero-Width decoded)
    const text = e.clipboardData.getData("text");
    if (text) {
      const vn = parseVoiceNoteFromClipboard(text);
      if (vn && vn.url && selectedConversation && user?.id) {
        e.preventDefault();
        setSending(true);
        try {
          await supabase.from("messages").insert({
            conversation_id: selectedConversation.id,
            sender_id: user.id,
            sender_type: "business",
            content: `[AUDIO_NOTE]:${vn.url}`,
          });
          await supabase
            .from("conversations")
            .update({
              last_message: "Voice note",
              last_message_at: new Date().toISOString(),
            })
            .eq("id", selectedConversation.id);
          toast({ title: "Voice note pasted and sent!" });
        } catch (err: any) {
          console.warn("Pasted voice note error:", err);
        } finally {
          setSending(false);
        }
        return;
      }
    }

    // 2. Check for pasted Image file from clipboard
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file && selectedConversation && user?.id) {
          e.preventDefault();
          setSending(true);
          try {
            const fileExt = file.name ? file.name.split(".").pop() || "png" : "png";
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
              .from("chat-attachments")
              .upload(fileName, file, { contentType: file.type || "image/png" });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);
            const imageUrl = data.publicUrl;

            await supabase.from("messages").insert({
              conversation_id: selectedConversation.id,
              sender_id: user.id,
              sender_type: "business",
              content: `[IMAGE]:${imageUrl}`,
            });

            await supabase
              .from("conversations")
              .update({
                last_message: "Photo attachment",
                last_message_at: new Date().toISOString(),
              })
              .eq("id", selectedConversation.id);

            toast({ title: "Image pasted and sent!" });
          } catch (err: any) {
            toast({
              variant: "destructive",
              title: "Image Upload Failed",
              description: err.message || "Could not send image",
            });
          } finally {
            setSending(false);
          }
          break; // Prevent duplicate messages from multi-format clipboard items
        }
      }
    }
  };

  // Reply, Forward, and Delete Handlers
  const handleReplyMessage = (msg: MessageData) => {
    setReplyingTo(msg);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleForwardMessage = (msg: MessageData) => {
    setMessageToForward(msg);
    setForwardModalOpen(true);
  };

  const handleConfirmForward = async (targetConvId: string, msg: MessageData) => {
    if (!user?.id) return;
    const contentToForward = msg.content;
    const { error } = await supabase.from("messages").insert({
      conversation_id: targetConvId,
      sender_id: user.id,
      sender_type: "business",
      content: contentToForward,
    });

    if (error) throw error;

    await supabase
      .from("conversations")
      .update({
        last_message: contentToForward,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", targetConvId);

    toast({
      title: "Message forwarded",
      description: "Sent to selected conversation.",
    });
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", msgId);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast({
        title: "Message deleted",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete message",
        description: err.message || "Please try again.",
      });
    }
  };

  useEffect(() => {
    const fetchBusinessId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setBusinessId(data.id);
      }
    };
    fetchBusinessId();
  }, [user?.id]);

  const fetchConversations = async () => {
    if (!businessId) return;
    try {
      let formatted: Conversation[] = [];
      const avatarMap: Record<string, string> = {};

      // 1. Try secure RPC first
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_business_conversations" as any, {
          p_business_id: businessId,
        });

        if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
          formatted = rpcData.map((c: any) => {
            if (c.avatar_url) avatarMap[c.customer_id] = c.avatar_url;
            return {
              id: c.id,
              customer_id: c.customer_id,
              customer_name: c.customer_name || "Shopper",
              avatar_url: c.avatar_url || null,
              last_message: c.last_message || null,
              last_message_at: c.last_message_at || new Date().toISOString(),
              unread_count: Number(c.unread_count || 0),
              verification_level: c.verification_level ? Number(c.verification_level) : 0,
            };
          });
        }
      } catch (rpcErr) {
        console.warn("RPC get_business_conversations fallback:", rpcErr);
      }

      // 2. Direct Table Query Fallback
      if (formatted.length === 0) {
        const { data: convData, error: tableErr } = await supabase
          .from("conversations")
          .select("id, customer_id, created_at, last_message, last_message_at")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });

        if (!tableErr && convData) {
          formatted = convData.map((c: any) => ({
            id: c.id,
            customer_id: c.customer_id,
            customer_name: "Shopper",
            avatar_url: null,
            last_message: c.last_message || null,
            last_message_at: c.last_message_at || c.created_at || new Date().toISOString(),
            unread_count: 0,
            verification_level: 0,
          }));
        }
      }

      // 3. Robust Multi-Tier Avatar & Name Hydration
      const custIds = Array.from(new Set(formatted.map((c) => c.customer_id).filter(Boolean)));
      if (custIds.length > 0) {
        try {
          // A. Fetch customers to resolve user_ids
          const { data: customers } = await supabase
            .from("customers")
            .select("id, user_id")
            .in("id", custIds);

          const custToUserMap: Record<string, string> = {};
          const userIds: string[] = [];

          (customers || []).forEach((cu: any) => {
            if (cu.user_id) {
              custToUserMap[cu.id] = cu.user_id;
              userIds.push(cu.user_id);
            }
          });

          const allProfileLookupIds = Array.from(new Set([...custIds, ...userIds]));

          // B. Fetch all matching profiles by user_id OR id
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, user_id, avatar_url, full_name, verification_level")
            .or(`id.in.(${allProfileLookupIds.join(",")}),user_id.in.(${allProfileLookupIds.join(",")})`);

          const userProfileMap: Record<string, { avatar_url?: string; full_name?: string; verification_level?: number }> = {};
          (profiles || []).forEach((p: any) => {
            if (p.id) userProfileMap[p.id] = p;
            if (p.user_id) userProfileMap[p.user_id] = p;
          });

          // C. Map back to formatted conversations
          formatted = formatted.map((conv) => {
            const linkedUserId = custToUserMap[conv.customer_id] || conv.customer_id;
            const prof = userProfileMap[conv.customer_id] || userProfileMap[linkedUserId];
            const av = prof?.avatar_url || conv.avatar_url || "";
            if (av) {
              avatarMap[conv.customer_id] = av;
              if (linkedUserId) avatarMap[linkedUserId] = av;
            }
            return {
              ...conv,
              customer_name: prof?.full_name || conv.customer_name,
              avatar_url: av || null,
              verification_level: prof?.verification_level || conv.verification_level || 0,
            };
          });
        } catch (hydrationErr) {
          console.warn("Avatar hydration error:", hydrationErr);
        }
      }

      setAvatars(avatarMap);
      setConversations(formatted);

      const targetId = searchParams.get("c");
      if (targetId) {
        const match = formatted.find(c => c.id === targetId);
        if (match) setSelectedConversation(match);
      }
    } catch (err: any) {
      console.warn("Error fetching business conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      fetchConversations();
    }
  }, [businessId]);

  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching messages",
          description: error.message,
        });
      } else {
        setMessages(data || []);
      }
    };

    fetchMessages();

    // Mark as read
    const markRead = async () => {
      const { error } = await supabase
        .from("messages")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("conversation_id", selectedConversation.id)
        .eq("sender_type", "customer")
        .is("read_at", null);

      if (!error) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c
          )
        );
      }
    };
    markRead();

    // Real-time subscription
    const channel = supabase
      .channel(`business_chat_${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as MessageData;
          setMessages((prev) => [...prev, newMsg]);
          if (newMsg.sender_type === "customer") {
            playChatAlert();
            supabase
              .from("messages")
              .update({ read: true, read_at: new Date().toISOString() })
              .eq("id", newMsg.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowFloatingDate(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    
    const container = e.currentTarget;
    const elements = Array.from(container.querySelectorAll('[data-date-group]'));
    
    let activeDate = floatingDate;
    const containerRect = container.getBoundingClientRect();

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      
      // If this element's top is visible in the container (or above it but the bottom is visible),
      // it's our active date. We check top <= containerRect.top + 100
      if (rect.top <= containerRect.top + 100) {
        activeDate = el.getAttribute('data-date-group') || "Today";
      } else {
        break; // Stop when we find one below the threshold
      }
    }

    if (activeDate !== floatingDate) {
      setFloatingDate(activeDate);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setShowFloatingDate(false);
    }, 1400);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id) return;

    let messageText = newMessage.trim();

    // Attach reply payload if replying
    if (replyingTo) {
      const replyAuthor = replyingTo.sender_type === "business" ? "You" : (selectedConversation.customer_name || "Shopper");
      const snippet = extractCleanSnippet(replyingTo.content, 50);

      const replyPayload = JSON.stringify({
        id: replyingTo.id,
        sender: replyAuthor,
        text: snippet,
      });

      messageText = `[REPLY:${replyPayload}]:${messageText}`;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_type: "business",
        content: messageText,
      });

      if (error) throw error;

      await supabase
        .from("conversations")
        .update({
          last_message: messageText,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", selectedConversation.id);

      setNewMessage("");
      setReplyingTo(null);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to send",
        description: err.message,
      });
    } finally {
      setSending(false);
    }
  };

  // Bid accept/decline handlers
  const handleAcceptBid = async (msgId: string, content: string) => {
    try {
      const bid = JSON.parse(content.slice(12));
      bid.status = "accepted";
      const updatedContent = `[BID_OFFER]:${JSON.stringify(bid)}`;

      await supabase.from("messages").update({ content: updatedContent }).eq("id", msgId);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: updatedContent } : m)));
      toast({ title: "Bid Accepted! Buyer notified for escrow payment." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action failed", description: err.message });
    }
  };

  const handleDeclineBid = async (msgId: string, content: string) => {
    try {
      const bid = JSON.parse(content.slice(12));
      bid.status = "declined";
      const updatedContent = `[BID_OFFER]:${JSON.stringify(bid)}`;

      await supabase.from("messages").update({ content: updatedContent }).eq("id", msgId);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: updatedContent } : m)));
      toast({ title: "Bid Declined." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action failed", description: err.message });
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isToday(d)) return "Today";
      if (isYesterday(d)) return "Yesterday";
      return format(d, "MMMM d, yyyy");
    } catch {
      return "Today";
    }
  };

  const groupedMessages = useMemo(() => {
    const groups: { date: string; items: MessageData[] }[] = [];
    messages.forEach((msg) => {
      const dateLabel = formatDateLabel(msg.created_at);
      const existing = groups.find((g) => g.date === dateLabel);
      if (existing) {
        existing.items.push(msg);
      } else {
        groups.push({ date: dateLabel, items: [msg] });
      }
    });
    return groups;
  }, [messages]);

  // Fullscreen view when chat is active
  if (selectedConversation) {
    return (
      <DashboardLayout fullScreen={true}>
        <div className="h-[100dvh] w-full flex flex-col bg-background text-foreground overflow-hidden select-none">
          
          {/* 1. BESPOKE CHAT HEADER */}
          <div className="h-14 px-3 border-b border-border/15 bg-background/95 backdrop-blur-xl flex items-center justify-between shrink-0 z-30 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedConversation(null);
                  setSearchParams({});
                }}
                className="h-9 w-9 rounded-full hover:bg-muted/70 flex items-center justify-center text-foreground transition-colors cursor-pointer shrink-0 active:scale-95"
                title="Back to inbox"
              >
                <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
              </button>

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-muted/80 to-muted overflow-hidden border border-border/30 shrink-0 flex items-center justify-center shadow-2xs">
                  {avatars[selectedConversation.customer_id] ? (
                    <img
                      src={getMaskedAssetUrl(avatars[selectedConversation.customer_id])}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-xs font-black text-foreground/80 uppercase select-none">
                      {selectedConversation.customer_name?.charAt(0) || "S"}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-xs text-foreground truncate flex items-center gap-1">
                    {selectedConversation.customer_name}
                    {Boolean(selectedConversation.verification_level && selectedConversation.verification_level > 0) && (
                      <ShieldCheck className="h-3.5 w-3.5 text-primary fill-primary/10 shrink-0" />
                    )}
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Verified Shopper
                  </p>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl p-1.5 min-w-[170px] shadow-xl">
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedConversation(null);
                    setSearchParams({});
                  }}
                  className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Return to Inbox
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 2. DYNAMIC FLOATING DATE BANNER */}
          <div className="relative flex-1 min-h-0 flex flex-col">
            {showFloatingDate && (
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-300 animate-in fade-in">
                <div className="bg-background/85 backdrop-blur-md border border-border/30 px-3 py-0.5 rounded-full text-[10px] font-black text-muted-foreground shadow-sm">
                  {floatingDate}
                </div>
              </div>
            )}

            {/* 3. SCROLLABLE MESSAGES STREAM */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 overscroll-contain scroll-smooth"
            >
              <div className="max-w-2xl mx-auto space-y-4">
                {groupedMessages.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-3" data-date-group={group.date}>
                    <div className="flex justify-center my-2">
                      <span className="bg-muted/40 border border-border/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-muted-foreground">
                        {group.date}
                      </span>
                    </div>

                    {group.items.map((msg) => (
                      <ChatMessageBubble
                        key={msg.id}
                        message={msg}
                        currentUserType="business"
                        partnerName={selectedConversation.customer_name}
                        onAcceptBid={handleAcceptBid}
                        onDeclineBid={handleDeclineBid}
                        onReply={handleReplyMessage}
                        onForward={handleForwardMessage}
                        onDelete={handleDeleteMessage}
                      />
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 4. PINNED BOTTOM INPUT DOCK (With Reply Preview Bar) */}
            <div className="sticky bottom-0 z-30 w-full bg-background/95 backdrop-blur-xl border-t border-border/15 p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg space-y-2">
              
              {/* REPLY PREVIEW BAR */}
              {replyingTo && (
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 p-2 px-3 rounded-2xl bg-muted/60 border border-border/25 backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 text-xs">
                  <div className="flex items-center gap-2 min-w-0 border-l-[3px] border-primary pl-2">
                    <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-[10px] uppercase text-primary truncate">
                        Replying to {replyingTo.sender_type === "business" ? "Yourself" : (selectedConversation.customer_name || "Shopper")}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {extractCleanSnippet(replyingTo.content, 60) || "Message"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Cancel reply"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="max-w-2xl mx-auto flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || isRecording}
                  className="h-10 w-10 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  title="Send photo"
                >
                  <ImageIcon className="h-5 w-5 stroke-[1.8]" />
                </button>

                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={isRecording ? `Recording audio... (${recordingDuration}s)` : replyingTo ? "Type your reply..." : "Reply to shopper..."}
                    disabled={isRecording}
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="min-h-[40px] max-h-32 resize-none rounded-2xl bg-muted/40 border border-border/25 px-3.5 py-2.5 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-primary shadow-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={sending}
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 shadow-xs active:scale-95",
                    isRecording
                      ? "bg-rose-500 text-white animate-pulse"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  title={isRecording ? "Stop and send voice note" : "Record voice note"}
                >
                  {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5 stroke-[1.8]" />}
                </button>

                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending || isRecording}
                  className="h-10 w-10 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-xs active:scale-95 disabled:opacity-40"
                  title="Send message"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 -ml-0.5 stroke-[2.2]" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* FORWARD MESSAGE MODAL */}
          <ForwardMessageModal
            open={forwardModalOpen}
            onOpenChange={setForwardModalOpen}
            messageToForward={messageToForward}
            conversations={conversations.map((c) => ({
              id: c.id,
              name: c.customer_name,
              logo_url: avatars[c.customer_id],
            }))}
            onConfirmForward={handleConfirmForward}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 pb-20 text-left">
        <div>
          <h1 className="text-xl font-black text-foreground">Inbox</h1>
          <p className="text-xs text-muted-foreground">Manage incoming chats, orders, and inquiries from verified campus shoppers</p>
        </div>

        <div className="bg-card rounded-3xl border border-border/20 overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-border/10 bg-muted/20">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Customer Conversations ({conversations.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
              <MessageCircle className="h-12 w-12 text-muted-foreground opacity-25" />
              <p className="text-xs font-bold text-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                When shoppers inquire about your products or services, their messages will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/10 p-1">
              {conversations.map((conv) => (
                <ChatConversationItem
                  key={conv.id}
                  conversation={{
                    id: conv.id,
                    partnerId: conv.customer_id,
                    partnerName: conv.customer_name,
                    lastMessage: conv.last_message,
                    lastMessageAt: conv.last_message_at,
                    unreadCount: conv.unread_count,
                    avatarUrl: conv.avatar_url || avatars[conv.customer_id],
                  }}
                  isSelected={false}
                  onSelect={() => {
                    setSelectedConversation(conv);
                    setSearchParams({ c: conv.id });
                  }}
                  partnerType="customer"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
