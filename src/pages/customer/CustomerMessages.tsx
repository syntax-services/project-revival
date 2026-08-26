import { useState, useEffect, useRef, useMemo } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  MessageCircle, Send, ArrowLeft, Loader2, 
  Mic, Square, Plus, ShieldCheck, Tag, 
  Image as ImageIcon, MoreVertical, Store, 
  ChevronLeft, Sparkles, X, Reply, Forward, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { playChatAlert } from "@/lib/audioAlert";
import { cn } from "@/lib/utils";
import { ChatMessageBubble, MessageData } from "@/components/messages/ChatMessageBubble";
import { ChatConversationItem } from "@/components/messages/ChatConversationItem";
import { ForwardMessageModal } from "@/components/messages/ForwardMessageModal";
import { getMaskedAssetUrl } from "@/lib/assetMask";
import { parseVoiceNoteFromClipboard } from "@/lib/clipboardMedia";
import { extractCleanSnippet } from "@/lib/messageUtils";
import { format, isToday, isYesterday } from "date-fns";

interface Conversation {
  id: string;
  business_id: string;
  business_name: string;
  logo_url?: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  verified?: boolean;
}

export default function CustomerMessages() {
  usePageMeta({
    title: "Direct Messages & Merchant Inquiries",
    description: "Real-time direct chat with campus merchants, price negotiation, and order communication.",
    keywords: ["chat seller","order messages","campus negotiations"],
    });

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetBizId = searchParams.get("biz");
  const targetProduct = searchParams.get("product") || searchParams.get("service");
  const targetLandmark = searchParams.get("landmark");
  const targetTime = searchParams.get("time");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState(() => {
    if (targetLandmark && targetTime) {
      return `Hi, I want to buy ${targetProduct || 'this'}. Let's meet at ${targetLandmark} at ${targetTime}.`;
    }
    return targetProduct ? `Hello! I am interested in: ${targetProduct}` : "";
  });
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [logos, setLogos] = useState<Record<string, string>>({});

  // Reply & Forward States
  const [replyingTo, setReplyingTo] = useState<MessageData | null>(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<MessageData | null>(null);
  const [activeStatus, setActiveStatus] = useState(false);

  useEffect(() => {
    if (!selectedConversation?.business_id) return;
    const checkStatus = async () => {
      const { data: bData } = await supabase.from('businesses').select('user_id').eq('id', selectedConversation.business_id).maybeSingle();
      if (bData?.user_id) {
        const { data: pData } = await supabase.from('profiles').select('last_seen_at').eq('id', bData.user_id).maybeSingle();
        if (pData?.last_seen_at) {
          const diff = Date.now() - new Date(pData.last_seen_at).getTime();
          setActiveStatus(diff < 5 * 60 * 1000);
        } else {
          setActiveStatus(false);
        }
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [selectedConversation?.business_id]);

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

  // Custom Bid Offer States
  const [bidOpen, setBidOpen] = useState(false);
  const [bidProduct, setBidProduct] = useState("");
  const [bidPrice, setBidPrice] = useState("");
  const [bidQty, setBidQty] = useState(1);
  const [bidNotes, setBidNotes] = useState("");

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
              sender_type: "customer",
              content: `[AUDIO_NOTE]:${audioUrl}`,
            });

            await supabase
              .from("conversations")
              .update({
                last_message: "[Audio Voice Note]",
                last_message_at: new Date().toISOString(),
              })
              .eq("id", selectedConversation.id);
          }
        } catch (err: any) {
          toast({
            variant: "destructive",
            title: "Voice note failed",
            description: err.message || "Failed to upload audio",
          });
        } finally {
          setSending(false);
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      toast({
        variant: "destructive",
        title: "Microphone Access Denied",
        description: "Please allow microphone access to send voice notes.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !user?.id) return;

    if (file.size > 8 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Images must be under 8MB",
      });
      return;
    }

    setSending(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(fileName);
      const imageUrl = data.publicUrl;

      await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_type: "customer",
        content: `[IMAGE]:${imageUrl}`,
      });

      await supabase
        .from("conversations")
        .update({
          last_message: "[Photo Attachment]",
          last_message_at: new Date().toISOString(),
        })
        .eq("id", selectedConversation.id);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Image Upload Failed",
        description: err.message || "Could not send image",
      });
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
            sender_type: "customer",
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
            const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
              .from("chat-attachments")
              .upload(fileName, file, { contentType: file.type || "image/png" });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);
            const imageUrl = data.publicUrl;

            await supabase.from("messages").insert({
              conversation_id: selectedConversation.id,
              sender_id: user.id,
              sender_type: "customer",
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
              description: err.message || "Please try again.",
            });
          } finally {
            setSending(false);
          }
          return;
        }
      }
    }
  };

  const handleSendBid = async () => {
    if (!bidProduct.trim() || !bidPrice || !selectedConversation || !user?.id) return;
    setSending(true);
    try {
      const bidData = {
        product: bidProduct.trim(),
        price: Number(bidPrice),
        quantity: bidQty,
        notes: bidNotes.trim(),
        status: "pending",
      };

      await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_type: "customer",
        content: `[BID_OFFER]:${JSON.stringify(bidData)}`,
      });

      await supabase
        .from("conversations")
        .update({
          last_message: `Custom Bid Offer: ${bidProduct.trim()} (₦${Number(bidPrice).toLocaleString()})`,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", selectedConversation.id);

      setBidOpen(false);
      setBidProduct("");
      setBidPrice("");
      setBidQty(1);
      setBidNotes("");
      toast({
        title: "Bid Dispatched",
        description: "Your custom escrow offer was sent to the merchant.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to Send Bid",
        description: err.message,
      });
    } finally {
      setSending(false);
    }
  };

  const handleConfirmSale = (msgId: string, payload: any) => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    
    toast({ title: "Verifying location..." });
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const R = 6371e3;
        const dLat = (latitude - payload.seller_lat) * Math.PI / 180;
        const dLon = (longitude - payload.seller_lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(payload.seller_lat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        if (distance > 1500) {
          toast({ title: "Verification failed", description: `You are too far from the seller (${Math.round(distance)}m).`, variant: "destructive" });
          return;
        }

        const newPayload = { ...payload, status: 'confirmed' };
        
        await supabase.from("messages").update({
          content: `[SALE_CONFIRMATION]:${JSON.stringify(newPayload)}`,
          tool_payload: newPayload
        }).eq("id", msgId);

        await supabase.from("chat_verified_sales").insert({
          conversation_id: selectedConversation!.id,
          business_id: selectedConversation!.business_id,
          customer_id: customerId,
          product_id: payload.product_id,
          distance_meters: Math.round(distance),
        });

        toast({ title: "Sale Confirmed!", description: "Awesome! Don't forget to review your purchase." });
      } catch (err: any) {
        toast({ title: "Error confirming sale", description: err.message, variant: "destructive" });
      }
    }, (error) => {
      toast({ title: "Failed to get location", description: error.message, variant: "destructive" });
    });
  };

  // 1. Fetch Conversations & Handle Deep-linked Merchants
  useEffect(() => {
    if (!user) return;

    const initConversations = async () => {
      setLoading(true);
      try {
        let currentCustomerId = user.id;

        try {
          const { data: cust } = await supabase
            .from("customers")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (cust?.id) {
            currentCustomerId = cust.id;
          } else {
            const { data: newC } = await supabase
              .from("customers")
              .insert({ user_id: user.id })
              .select("id")
              .maybeSingle();
            if (newC?.id) currentCustomerId = newC.id;
          }
        } catch (e) {
          console.warn("Customer account verification fallback:", e);
        }
        setCustomerId(currentCustomerId);

        let convs: Conversation[] = [];
        const logoMap: Record<string, string> = {};

        // Try RPC
        try {
          const { data: rpcData, error: rpcErr } = await supabase.rpc("get_my_customer_conversations" as any);
          if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
            convs = rpcData.map((c: any) => {
              if (c.logo_url) logoMap[c.business_id] = c.logo_url;
              return {
                id: c.id,
                business_id: c.business_id,
                business_name: c.business_name || "Merchant Shop",
                logo_url: c.logo_url || null,
                last_message: c.last_message,
                last_message_at: c.last_message_at || new Date().toISOString(),
                unread_count: Number(c.unread_count || 0),
                verified: !!c.verified,
              };
            });
          }
        } catch (e) {
          console.warn("RPC get_my_customer_conversations fallback:", e);
        }

        // Direct table fallback
        if (convs.length === 0) {
          const { data: convData } = await supabase
            .from("conversations")
            .select(`
              id,
              business_id,
              created_at,
              last_message,
              last_message_at
            `)
            .or(`customer_id.eq.${currentCustomerId},customer_id.eq.${user.id}`)
            .order("created_at", { ascending: false });

          if (convData) {
            convs = convData.map((c: any) => ({
              id: c.id,
              business_id: c.business_id,
              business_name: "Merchant Shop",
              logo_url: null,
              last_message: c.last_message || null,
              last_message_at: c.last_message_at || c.created_at || new Date().toISOString(),
              unread_count: 0,
              verified: false,
            }));
          }
        }

        // Always query business logos and cover images for all conversations
        const bizIds = Array.from(new Set(convs.map((c) => c.business_id).filter(Boolean)));
        if (bizIds.length > 0) {
          try {
            const { data: bizData } = await supabase
              .from("businesses")
              .select("id, user_id, company_name, logo_url, cover_image_url, location_verified")
              .in("id", bizIds);

            const bizUserIds = (bizData || []).map((b) => b.user_id).filter(Boolean);

            let profMap: Record<string, string> = {};
            if (bizUserIds.length > 0) {
              const { data: profs } = await supabase
                .from("profiles")
                .select("id, user_id, avatar_url")
                .in("user_id", bizUserIds);

              (profs || []).forEach((p: any) => {
                if (p.avatar_url) {
                  if (p.user_id) profMap[p.user_id] = p.avatar_url;
                  if (p.id) profMap[p.id] = p.avatar_url;
                }
              });
            }

            const bizMap: Record<string, any> = {};
            (bizData || []).forEach((b: any) => {
              const img = b.logo_url || b.cover_image_url || profMap[b.user_id] || "";
              if (img) logoMap[b.id] = img;
              bizMap[b.id] = { ...b, img };
            });

            convs = convs.map((c) => {
              const b = bizMap[c.business_id];
              const logo = b?.img || logoMap[c.business_id] || c.logo_url || null;
              return {
                ...c,
                business_name: b?.company_name || c.business_name,
                logo_url: logo,
                verified: b?.location_verified ?? c.verified,
              };
            });
          } catch (e) {
            console.warn("Business logo hydration fallback:", e);
          }
        }

        setLogos(logoMap);
        setConversations(convs);

        // Auto-provision or open target conversation
        if (targetBizId) {
          const match = convs.find((c) => c.business_id === targetBizId);
          if (match) {
            setSelectedConversation(match);
          } else {
            try {
              const { data: rpcRows } = await supabase.rpc("start_or_get_conversation" as any, {
                p_business_id: targetBizId,
              });

              if (rpcRows && rpcRows.length > 0) {
                const row = rpcRows[0];
                const created: Conversation = {
                  id: row.conversation_id,
                  business_id: row.business_id,
                  business_name: row.business_name || "Merchant Shop",
                  logo_url: row.logo_url || null,
                  last_message: row.last_message,
                  last_message_at: row.last_message_at || new Date().toISOString(),
                  unread_count: 0,
                  verified: !!row.verified,
                };
                if (row.logo_url) logoMap[row.business_id] = row.logo_url;
                setConversations((prev) => [created, ...prev.filter(c => c.id !== created.id)]);
                setSelectedConversation(created);
              }
            } catch (err) {
              console.warn("Failed to create conversation:", err);
            }
          }
        }
      } catch (err) {
        console.error("Init conversations error:", err);
      } finally {
        setLoading(false);
      }
    };

    initConversations();
  }, [user?.id, targetBizId]);

  // 2. Fetch messages in selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(data.map(m => ({
          id: m.id,
          content: m.content,
          sender_type: m.sender_type as "customer" | "business",
          created_at: m.created_at,
          read: !!m.read_at,
        })));

        const { error } = await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("conversation_id", selectedConversation.id)
          .eq("sender_type", "business")
          .is("read_at", null);

        if (!error) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c
            )
          );
        }
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages-${selectedConversation.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const m = payload.new as { id: string; content: string; sender_type: string; created_at: string; read_at: string | null };
          setMessages((prev) => [...prev, {
            id: m.id,
            content: m.content,
            sender_type: m.sender_type as any,
            created_at: m.created_at,
            read: !!m.read_at,
          }]);
          if (m.sender_type === "business") {
            playChatAlert();
          }
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

  // Telegram-style dynamic floating date banner on scroll
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
      sender_type: "customer",
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
      description: "Your message has been sent to the selected conversation.",
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

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id) return;

    let messageText = newMessage.trim();

    // Attach reply payload if replying
    if (replyingTo) {
      const replyAuthor = replyingTo.sender_type === "customer" ? "You" : (selectedConversation.business_name || "Merchant Shop");
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
        sender_type: "customer",
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
        description: err.message || "Please try again.",
      });
    } finally {
      setSending(false);
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

  // Group messages for clean daily timeline
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

  // Render Full Screen immersive view when chat is active
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
                title="Back to conversations"
              >
                <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
              </button>

              <div 
                onClick={() => navigate(`/business/${selectedConversation.business_id}`)}
                className="flex items-center gap-2.5 cursor-pointer group min-w-0"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-muted/80 to-muted overflow-hidden border border-border/30 shrink-0 flex items-center justify-center shadow-2xs">
                  {logos[selectedConversation.business_id] ? (
                    <img
                      src={getMaskedAssetUrl(logos[selectedConversation.business_id])}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-xs font-black text-foreground/80 uppercase select-none">
                      {selectedConversation.business_name?.charAt(0) || "B"}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-xs text-foreground truncate flex items-center gap-1 group-hover:text-primary transition-colors">
                    {selectedConversation.business_name}
                    {selectedConversation.verified && (
                      <ShieldCheck className="h-4 w-4 text-emerald-500 ml-1.5 shrink-0" />
                    )}
                  </h2>
                  {activeStatus && (
                    <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                      Active
                    </span>
                  )}
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Campus Merchant
                  </p>
                </div>
              </div>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBidOpen(true)}
                className="rounded-full text-[11px] font-bold h-7 px-3 gap-1 border-primary/30 text-primary hover:bg-primary/10 shadow-xs"
              >
                <Tag className="h-3 w-3" /> Custom Bid
              </Button>

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
                    onClick={() => navigate(`/business/${selectedConversation.business_id}`)}
                    className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
                  >
                    <Store className="h-3.5 w-3.5" /> Visit Storefront
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedConversation(null);
                      setSearchParams({});
                    }}
                    className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Exit to Inbox
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 2. DYNAMIC FLOATING DATE BANNER (Telegram-Style) */}
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
                    {/* Centered Date Chip */}
                    <div className="flex justify-center my-2">
                      <span className="bg-muted/40 border border-border/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-muted-foreground">
                        {group.date}
                      </span>
                    </div>

                    {group.items.map((msg) => (
                      <ChatMessageBubble
                        key={msg.id}
                        message={msg}
                        currentUserType="customer"
                        partnerName={selectedConversation.business_name}
                        onReply={handleReplyMessage}
                        onForward={handleForwardMessage}
                        onDelete={handleDeleteMessage}
                        onConfirmSale={handleConfirmSale}
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
                        Replying to {replyingTo.sender_type === "customer" ? "Yourself" : (selectedConversation.business_name || "Merchant Shop")}
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
                
                {/* Image Upload Trigger */}
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
                  title="Send photo attachment"
                >
                  <ImageIcon className="h-5 w-5 stroke-[1.8]" />
                </button>

                {/* Textarea Input */}
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={isRecording ? `Recording audio... (${recordingDuration}s)` : replyingTo ? "Type your reply..." : "Type a message..."}
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

                {/* Voice Note Recorder Button */}
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

                {/* Send Button */}
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

          {/* CUSTOM BID OFFER DIALOG */}
          <Dialog open={bidOpen} onOpenChange={setBidOpen}>
            <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-border/20 text-left">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" /> Dispatch Custom Escrow Bid
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3.5 pt-2 text-xs">
                <div className="space-y-1">
                  <Label>Item Name or Specification</Label>
                  <Input
                    value={bidProduct}
                    onChange={(e) => setBidProduct(e.target.value)}
                    placeholder="e.g., Customized Nike Air Force 1"
                    className="rounded-xl google-input text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Offered Unit Price (₦)</Label>
                    <Input
                      type="number"
                      value={bidPrice}
                      onChange={(e) => setBidPrice(e.target.value)}
                      placeholder="e.g., 25000"
                      className="rounded-xl google-input text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={bidQty}
                      onChange={(e) => setBidQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="rounded-xl google-input text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Special Instructions / Notes</Label>
                  <Textarea
                    value={bidNotes}
                    onChange={(e) => setBidNotes(e.target.value)}
                    placeholder="Provide sizing, delivery specifications, or requirements..."
                    rows={2}
                    className="rounded-xl google-input text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBidOpen(false)}
                    className="flex-1 rounded-2xl text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSendBid}
                    disabled={!bidProduct.trim() || !bidPrice || sending}
                    className="flex-1 rounded-2xl text-xs font-black bg-primary text-primary-foreground"
                  >
                    Send Escrow Offer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* FORWARD MESSAGE MODAL */}
          <ForwardMessageModal
            open={forwardModalOpen}
            onOpenChange={setForwardModalOpen}
            messageToForward={messageToForward}
            conversations={conversations.map((c) => ({
              id: c.id,
              name: c.business_name,
              logo_url: logos[c.business_id],
              verified: c.verified,
            }))}
            onConfirmForward={handleConfirmForward}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Conversation List View
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 pb-20 text-left">
        <div>
          <h1 className="text-xl font-black text-foreground">Messages</h1>
          <p className="text-xs text-muted-foreground">Direct chat with verified campus merchants and custom offers</p>
        </div>

        <div className="bg-card rounded-3xl border border-border/20 overflow-hidden shadow-xs">
          <div className="p-3.5 border-b border-border/10 bg-muted/20">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Recent Conversations ({conversations.length})
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
                Tap "Chat Seller" on any item in Discover or the Home feed to start chatting.
              </p>
              <Button onClick={() => navigate("/customer/discover")} variant="secondary" className="rounded-2xl text-xs font-bold">
                Browse Campus Stores
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/10 p-1">
              {conversations.map((conv) => (
                <ChatConversationItem
                  key={conv.id}
                  conversation={{
                    id: conv.id,
                    partnerId: conv.business_id,
                    partnerName: conv.business_name,
                    lastMessage: conv.last_message,
                    lastMessageAt: conv.last_message_at,
                    unreadCount: conv.unread_count,
                    verified: conv.verified,
                    avatarUrl: conv.logo_url || logos[conv.business_id],
                  }}
                  isSelected={false}
                  onSelect={() => {
                    setSelectedConversation(conv);
                    setSearchParams({ biz: conv.business_id });
                  }}
                  partnerType="business"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
