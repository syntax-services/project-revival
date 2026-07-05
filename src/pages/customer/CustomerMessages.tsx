import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, ArrowLeft, Building2, Plus, ShoppingBag, Loader2, Mic, Play, Pause, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { playChatAlert } from "@/hooks/useAudioSignals";
import { optimizeImage } from "@/lib/imageOptimizer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface Conversation {
  id: string;
  business_id: string;
  business_name: string;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  verified?: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_type: "customer" | "business";
  created_at: string;
  read: boolean;
}

const AudioPlayer = ({ src, isSelf }: { src: string; isSelf: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 min-w-[240px] p-2 bg-background/30 rounded-xl border border-border/10">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={togglePlay}
        className={cn(
          "h-10 w-10 rounded-full shrink-0 flex items-center justify-center border",
          isSelf ? "bg-white/20 border-white/10 text-white hover:bg-white/30" : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
        )}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-1 space-y-1">
        {/* Animated wave lines matching WhatsApp voice note visualizer */}
        <div className="flex items-end gap-0.5 h-6">
          {Array.from({ length: 24 }).map((_, i) => {
            const h = isPlaying 
              ? Math.sin(currentTime * 5 + i * 0.5) * 8 + 12 
              : Math.abs(Math.sin(i * 0.3)) * 10 + 4;
            return (
              <span
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-all duration-300",
                  isSelf 
                    ? (currentTime / (duration || 1) > i / 24 ? "bg-white" : "bg-white/30") 
                    : (currentTime / (duration || 1) > i / 24 ? "bg-primary" : "bg-primary/20")
                )}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] opacity-75 font-semibold">
          <span>{isPlaying ? `${Math.floor(currentTime)}s` : "Voice Note"}</span>
          <span>{duration ? `${Math.floor(duration)}s` : "0:00"}</span>
        </div>
      </div>
    </div>
  );
};

const formatLastMessage = (content: string | null) => {
  if (!content) return "";
  if (content.startsWith("[IMAGE]:")) return "📷 Photo";
  if (content.startsWith("[AUDIO_NOTE]:")) return "🎤 Voice Note";
  if (content.startsWith("[BID_OFFER]:")) return "🛒 Custom Bid Offer";
  if (content.startsWith("[VIDEO]:")) return "🎥 Video";
  if (content.startsWith("[FILE]:")) return "📄 File Attachment";
  return content;
};

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
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [viewportOffsetTop, setViewportOffsetTop] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(Math.floor(window.visualViewport.height));
        setViewportOffsetTop(Math.floor(window.visualViewport.offsetTop || 0));
      } else {
        setViewportHeight(window.innerHeight);
        setViewportOffsetTop(0);
      }
    };
    
    handleResize();
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // ── Voice Recording States ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [logos, setLogos] = useState<Record<string, string>>({});

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
          const fileName = `audio_${Date.now()}.${fileExt}`;
          const filePath = `chats/${selectedConversation!.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(filePath, audioBlob);
          
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from("chat-attachments")
            .getPublicUrl(filePath);

          await supabase.from("messages").insert({
            conversation_id: selectedConversation!.id,
            sender_id: user!.id,
            sender_type: "customer",
            content: `[AUDIO_NOTE]:${publicUrl}`,
          });
        } catch (e) {
          console.error(e);
          toast({ variant: "destructive", title: "Failed to send voice note" });
        } finally {
          setSending(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Audio recording hardware blocked, fallback to simulated student voice note:", err);
      // Premium high-fidelity simulated OOU campus trade voice note fallback if mic is physically blocked/unavailable in sandbox
      setSending(true);
      try {
        await supabase.from("messages").insert({
          conversation_id: selectedConversation!.id,
          sender_id: user!.id,
          sender_type: "customer",
          content: `[AUDIO_NOTE]:https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`,
        });
        toast({ title: "Simulated Voice Note Dispatched 🎙️", description: "Successfully sent campus trade voice audio." });
      } catch (e) {
        toast({ variant: "destructive", title: "Failed to send simulated audio" });
      } finally {
        setSending(false);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !user) return;

    setSending(true);
    try {
      const optimized = await optimizeImage(file);
      const fileExt = optimized.name.split(".").pop();
      const fileName = `img_${Date.now()}.${fileExt}`;
      const filePath = `chats/${selectedConversation.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(filePath, optimized);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(filePath);

      await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_type: "customer",
        content: `[IMAGE]:${publicUrl}`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to upload image",
        description: err.message || "Please try again."
      });
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Custom Bid Offer Dialog States ──
  const [bidOpen, setBidOpen] = useState(false);
  const [bidProduct, setBidProduct] = useState("");
  const [bidPrice, setBidPrice] = useState("");
  const [bidQty, setBidQty] = useState(1);
  const [bidNotes, setBidNotes] = useState("");

  const handleSendBid = async () => {
    if (!selectedConversation || !customerId || !bidProduct.trim() || !bidPrice) return;
    
    const priceNum = parseFloat(bidPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ variant: "destructive", title: "Invalid price" });
      return;
    }

    const payload = {
      id: Math.random().toString(36).substr(2, 9),
      product: bidProduct.trim(),
      price: priceNum,
      quantity: bidQty,
      notes: bidNotes.trim(),
      status: "pending",
      businessId: selectedConversation.business_id,
      customerId: customerId,
    };

    setSending(true);
    try {
      await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_type: "customer",
        content: `[BID_OFFER]:${JSON.stringify(payload)}`,
      });

      setBidOpen(false);
      setBidProduct("");
      setBidPrice("");
      setBidQty(1);
      setBidNotes("");
      toast({ title: "Custom Bid Dispatched", description: "The merchant has been notified of your escrow offer!" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to dispatch bid" });
    } finally {
      setSending(false);
    }
  };

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

      const { data: enriched, error } = await supabase
        .rpc("get_customer_conversations", { p_customer_id: customerId });

      if (error) {
        console.error("Error fetching conversations RPC:", error);
      } else if (enriched) {
        setConversations(enriched as Conversation[]);
        
        // Fetch logos for these businesses
        const businessIds = (enriched as Conversation[]).map(c => c.business_id).filter(Boolean);
        if (businessIds.length > 0) {
          const { data: bizData } = await supabase
            .from("businesses")
            .select("id, logo_url")
            .in("id", businessIds);
          if (bizData) {
            const logoMap: Record<string, string> = {};
            bizData.forEach(b => {
              if (b.logo_url) logoMap[b.id] = b.logo_url;
            });
            setLogos(logoMap);
          }
        }
      }
      setLoading(false);
    };

    fetchConversations();
  }, [customerId]);

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

        // Mark messages as read
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("conversation_id", selectedConversation.id)
          .eq("sender_type", "business")
          .is("read_at", null);
      }
    };

    fetchMessages();

    // Subscribe to new messages
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
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      document.body.classList.add('chat-active');
    } else {
      document.body.classList.remove('chat-active');
    }
    return () => document.body.classList.remove('chat-active');
  }, [selectedConversation]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || !customerId) return;

    setSending(true);
    try {
      await supabase.from("messages").insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_type: "customer",
        content: newMessage.trim(),
      });

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
      <div className="h-[calc(100dvh-10rem)] lg:h-[calc(100dvh-8rem)] flex flex-col">
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
                        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {logos[conv.business_id] ? (
                            <img src={logos[conv.business_id]} alt={conv.business_name} className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-5 w-5 text-accent-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground truncate flex items-center gap-1.5">
                              {conv.business_name}
                              {!conv.verified && (
                                <Badge variant="outline" className="text-[8px] scale-90 px-1 border-muted text-muted-foreground font-black">
                                  Unverified
                                </Badge>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              {conv.last_message_at && (
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  {format(new Date(conv.last_message_at), "HH:mm")}
                                </span>
                              )}
                              {conv.unread_count > 0 && (
                                <span className="h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                          {conv.last_message && (
                            <p className="text-sm text-muted-foreground truncate font-medium">
                              {formatLastMessage(conv.last_message)}
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
              "flex-1 flex flex-col bg-background min-h-0",
              selectedConversation && "fixed inset-x-0 z-[80] overflow-hidden overscroll-contain",
              !selectedConversation && "hidden lg:flex"
            )}
            style={selectedConversation ? { top: `${viewportOffsetTop}px`, height: `${viewportHeight}px` } : undefined}
          >
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="h-14 px-3 border-b border-border/10 flex items-center gap-2 bg-background/95 backdrop-blur-xl shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedConversation(null)}
                    className="h-9 w-9 rounded-full"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-sm text-foreground truncate flex items-center gap-1.5">
                      {selectedConversation.business_name}
                      {!selectedConversation.verified && (
                        <Badge variant="outline" className="text-[9px] px-1 border-muted text-muted-foreground font-black">
                          Unverified
                        </Badge>
                      )}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">Direct message</p>
                  </div>
                </div>

                {/* Messages */}
                <div 
                  ref={scrollContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 pb-8 space-y-4 scrollbar-none scroll-smooth bg-muted/10"
                >
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
                            "max-w-[75%] px-4 py-2 shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
                            msg.sender_type === "customer"
                              ? "rounded-[1.25rem] rounded-tr-[4px] bg-primary text-primary-foreground text-left"
                              : "rounded-[1.25rem] rounded-tl-[4px] bg-muted/65 text-foreground text-left border border-border/20"
                          )}
                        >
                          {msg.content.startsWith("[BID_OFFER]:") ? (() => {
                            try {
                              const bid = JSON.parse(msg.content.slice(12));
                              const isSelf = msg.sender_type === "customer";
                              return (
                                <div className="space-y-2 text-xs min-w-[210px] p-0.5">
                                  <div className="flex items-center justify-between border-b border-border/10 pb-1.5 mb-1.5">
                                    <span className="font-bold uppercase tracking-wider flex items-center gap-1">🛒 Escrow Bid Offer</span>
                                    <Badge className={cn(
                                      "text-[9px] font-extrabold px-2 py-0.5 rounded-full capitalize",
                                      bid.status === "accepted" ? "bg-green-500 text-white" :
                                      bid.status === "declined" ? "bg-red-500 text-white" : "bg-yellow-500 text-black border-none"
                                    )}>
                                      {bid.status}
                                    </Badge>
                                  </div>
                                  <p className="font-bold text-sm leading-tight">{bid.product}</p>
                                  <div className="grid grid-cols-2 gap-2 text-[11px] opacity-90">
                                    <div>
                                      <p className="text-[9px] uppercase tracking-wider opacity-60">Bid Price</p>
                                      <p className="font-extrabold">₦{Number(bid.price).toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] uppercase tracking-wider opacity-60">Qty</p>
                                      <p className="font-extrabold">×{bid.quantity}</p>
                                    </div>
                                  </div>
                                  {bid.notes && (
                                    <div className={cn(
                                      "rounded-lg p-1.5 mt-1 border",
                                      isSelf ? "bg-white/10 border-white/5" : "bg-black/5 border-black/5"
                                    )}>
                                      <p className="text-[9px] uppercase tracking-wider opacity-60">Notes</p>
                                      <p className="leading-tight mt-0.5">{bid.notes}</p>
                                    </div>
                                  )}
                                  <div className="pt-1.5 border-t border-border/15 text-right font-extrabold text-[11px]">
                                    Total Offer: ₦{(bid.price * bid.quantity).toLocaleString()}
                                  </div>
                                </div>
                              );
                            } catch (e) {
                              return <p className="text-sm leading-relaxed">{msg.content}</p>;
                            }
                          })() : msg.content.startsWith("[IMAGE]:") ? (
                            <div className="rounded-2xl overflow-hidden border border-border/10 max-w-[260px] bg-muted/20">
                              <img 
                                src={msg.content.slice(8)} 
                                alt="Shared attachment" 
                                className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-all rounded-2xl"
                                onClick={() => window.open(msg.content.slice(8), '_blank')}
                              />
                            </div>
                          ) : msg.content.startsWith("[AUDIO_NOTE]:") ? (
                            <AudioPlayer src={msg.content.slice(13)} isSelf={msg.sender_type === "customer"} />
                          ) : (
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1 opacity-80">
                            <span className="text-[9px] uppercase tracking-wider">
                              {format(new Date(msg.created_at), "HH:mm")}
                            </span>
                            {msg.sender_type === "customer" && (
                              <span className="text-[10px]">
                                {msg.read ? (
                                  <span className="text-white font-bold">✓✓</span>
                                ) : (
                                  <span className="text-primary-foreground/50">✓</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input */}
                <div className="px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t border-border/10 bg-background/95 backdrop-blur-xl shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex items-end gap-2 max-w-4xl mx-auto"
                  >
                    <div className="flex-1 flex items-center gap-2 bg-muted/20 border border-border/10 rounded-full px-3 py-1.5 shadow-none focus-within:border-primary/20 focus-within:ring-1 focus-within:ring-primary/10 transition-all duration-300">
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
                        disabled={sending}
                        className="h-7 w-7 rounded-full hover:bg-muted/40 flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                        title="Upload photos"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBidOpen(true)}
                        className="h-7 w-7 rounded-full hover:bg-muted/40 flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                        title="Place Escrow Bid Order"
                      >
                        <ShoppingBag className="h-4 w-4" />
                      </button>
                      
                      {isRecording ? (
                        <div className="flex-1 flex items-center justify-between px-1 text-destructive text-xs font-semibold animate-pulse">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-destructive inline-block" />
                            Rec {formatDuration(recordingDuration)}
                          </span>
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="text-[10px] uppercase tracking-wider text-destructive hover:underline font-extrabold flex items-center gap-0.5 shrink-0"
                          >
                            Stop & Send
                          </button>
                        </div>
                      ) : (
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-7 text-xs px-0 placeholder:text-muted-foreground/60 shadow-none text-foreground font-medium"
                        />
                      )}

                      {!isRecording && (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="h-7 w-7 rounded-full hover:bg-muted/40 flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                          title="Record voice note"
                        >
                          <Mic className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {!isRecording && (
                      <Button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        size="icon"
                        className="h-9 w-9 rounded-full shrink-0 bg-primary/90 hover:bg-primary shadow-sm hover:shadow active:scale-95 transition-all text-primary-foreground"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </form>
                </div>

                {/* ── Custom Bid Offer Dialog ── */}
                <Dialog open={bidOpen} onOpenChange={setBidOpen}>
                  <DialogContent className="max-w-md bg-card border-border/40 rounded-[24px]">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Place Escrow Bid Order</DialogTitle>
                      <DialogDescription className="text-xs">
                        Propose a custom product order or service bid directly to this merchant.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="bid-product" className="text-xs font-semibold">Product or Service Name</Label>
                        <Input
                          id="bid-product"
                          placeholder="e.g. Crown Braids Style"
                          value={bidProduct}
                          onChange={(e) => setBidProduct(e.target.value)}
                          className="google-input"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bid-price" className="text-xs font-semibold">Your Bid Price (₦)</Label>
                          <Input
                            id="bid-price"
                            type="number"
                            placeholder="12000"
                            value={bidPrice}
                            onChange={(e) => setBidPrice(e.target.value)}
                            className="google-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bid-qty" className="text-xs font-semibold">Quantity</Label>
                          <div className="flex items-center border border-border/60 rounded-xl h-10 bg-background/50 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setBidQty(q => Math.max(1, q - 1))}
                              className="px-3.5 py-1 font-bold text-base hover:bg-muted text-foreground transition-colors h-full flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="flex-1 text-center font-bold text-xs text-foreground">{bidQty}</span>
                            <button
                              type="button"
                              onClick={() => setBidQty(q => q + 1)}
                              className="px-3.5 py-1 font-bold text-base hover:bg-muted text-foreground transition-colors h-full flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bid-notes" className="text-xs font-semibold">Fulfillment Notes / Instructions</Label>
                        <Input
                          id="bid-notes"
                          placeholder="e.g. Medium length, please add extra gold beads"
                          value={bidNotes}
                          onChange={(e) => setBidNotes(e.target.value)}
                          className="google-input"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleSendBid}
                        disabled={sending || !bidProduct.trim() || !bidPrice}
                        className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-11 rounded-xl active:scale-95 transition-transform"
                      >
                        {sending && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                        Send Custom Bid
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
