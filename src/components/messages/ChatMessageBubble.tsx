import { useState, useRef } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "@/components/messages/AudioPlayer";
import { getMaskedAssetUrl } from "@/lib/assetMask";
import { extractCleanSnippet } from "@/lib/messageUtils";
import { 
  ShieldCheck, Tag, CheckCircle2, XCircle, 
  Clock, ShieldAlert, Check, CheckCheck, Eye, 
  X, Download, Image as ImageIcon,
  Reply, Forward, Copy, Trash2, MoreHorizontal, ChevronLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { copyImageToClipboard, copyVoiceNoteToClipboard } from "@/lib/clipboardMedia";

export interface MessageData {
  id: string;
  content: string;
  sender_type: "customer" | "business";
  created_at: string;
  read?: boolean;
  read_at?: string | null;
}

interface ChatMessageBubbleProps {
  message: MessageData;
  currentUserType: "customer" | "business";
  partnerName?: string;
  onAcceptBid?: (msgId: string, content: string) => void;
  onDeclineBid?: (msgId: string, content: string) => void;
  onReply?: (message: MessageData) => void;
  onForward?: (message: MessageData) => void;
  onDelete?: (msgId: string) => void;
  onConfirmSale?: (msgId: string, payload: any) => void;
}

export function ChatMessageBubble({
  message,
  currentUserType,
  partnerName = "Partner",
  onAcceptBid,
  onDeclineBid,
  onReply,
  onForward,
  onDelete,
  onConfirmSale,
}: ChatMessageBubbleProps) {
  const isSelf = message.sender_type === currentUserType;
  const [imgError, setImgError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // ── Swipe-to-Reply State ──
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);

  // ── Reply / Quote Parsing (Recursive Unnesting & Null Safe) ──
  let replyData: { id?: string; sender?: string; text?: string } | null = null;
  let cleanContent = message.content || "";

  while (cleanContent.startsWith("[REPLY:")) {
    try {
      const closingIdx = cleanContent.indexOf("]:");
      if (closingIdx !== -1) {
        if (!replyData) {
          const jsonStr = cleanContent.slice(7, closingIdx);
          const parsed = JSON.parse(jsonStr);
          const cleanSnippet = extractCleanSnippet(parsed?.text);
          replyData = {
            id: parsed?.id,
            sender: parsed?.sender && parsed?.sender !== "null" ? parsed.sender : "Reply",
            text: cleanSnippet && cleanSnippet !== "null" ? cleanSnippet : "Message",
          };
        }
        cleanContent = cleanContent.slice(closingIdx + 2).trim();
      } else {
        cleanContent = cleanContent.replace(/^\[REPLY:[^\]]+\]:/, "").trim();
        break;
      }
    } catch (e) {
      console.warn("Error parsing reply JSON:", e);
      cleanContent = cleanContent.replace(/^\[REPLY:[^\]]+\]:/, "").trim();
      break;
    }
  }

  const isAudio = cleanContent.startsWith("[AUDIO_NOTE]:");

  const isImageMessage = (text: string) => {
    if (!text) return false;
    const trimmed = text.trim();
    return (
      trimmed.startsWith("[IMAGE]:") ||
      trimmed.startsWith("[IMAGE]") ||
      trimmed.includes("/chat-attachments/") ||
      trimmed.includes("/product-images/") ||
      trimmed.includes("/business-images/") ||
      trimmed.includes("/storage/v1/object/public/") ||
      /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(trimmed)
    );
  };

  const extractImageUrl = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.startsWith("[IMAGE]:")) return trimmed.slice(8).trim();
    if (trimmed.startsWith("[IMAGE]")) return trimmed.slice(7).trim();
    return trimmed;
  };

  const isImage = isImageMessage(cleanContent);
  const rawImageUrl = isImage ? extractImageUrl(cleanContent) : "";
  const maskedImageUrl = isImage ? getMaskedAssetUrl(rawImageUrl) : "";

  const formatMsgTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "h:mm a");
    } catch {
      return "";
    }
  };

  // Touch Handlers for Swipe-to-Reply & Long-Press
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;

    // Start 450ms long-press timer for mobile
    longPressTimerRef.current = setTimeout(() => {
      if (!isSwipingRef.current && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    const deltaY = e.touches[0].clientY - touchStartYRef.current;

    // If moved, cancel long press
    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Check if horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwipingRef.current = true;
      const pull = isSelf ? Math.min(0, Math.max(-65, deltaX)) : Math.max(0, Math.min(65, deltaX));
      setSwipeOffset(pull);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (Math.abs(swipeOffset) > 42 && onReply) {
      onReply(message);
      if (navigator.vibrate) navigator.vibrate(20);
    }
    setSwipeOffset(0);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isSwipingRef.current = false;
  };

  const handleCopyText = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // 1. Image Copy (Copies binary PNG blob to device clipboard)
    if (isImage) {
      const ok = await copyImageToClipboard(rawImageUrl);
      if (ok) toast.success("Image copied to clipboard");
      else toast.error("Could not copy image");
      return;
    }

    // 2. Voice Note Copy (Zero-Width Steganography)
    if (isAudio) {
      let audioUrl = cleanContent.slice(13).trim();
      try {
        if (audioUrl.startsWith("{")) {
          const parsed = JSON.parse(audioUrl);
          audioUrl = parsed.url || audioUrl;
        }
      } catch {}
      const ok = await copyVoiceNoteToClipboard(audioUrl);
      if (ok) toast.success("Voice note copied to clipboard");
      else toast.error("Could not copy voice note");
      return;
    }

    // 3. Regular Text & Bid Copy
    let textToCopy = cleanContent;
    if (cleanContent.startsWith("[BID_OFFER]:")) {
      try {
        const b = JSON.parse(cleanContent.slice(12));
        textToCopy = `Custom Bid: ${b.product} - ₦${Number(b.price).toLocaleString()} (Qty: ${b.quantity})`;
      } catch {}
    }
    navigator.clipboard.writeText(textToCopy);
    toast.success("Copied to clipboard");
  };

  // SYSTEM NOTIFICATION MESSAGE
  if (message.content.startsWith("[SYSTEM]:")) {
    return (
      <div className="flex justify-center my-2 animate-in fade-in">
        <div className="flex items-center gap-2 max-w-md bg-muted/50 border border-border/20 rounded-full px-3 py-1 text-[11px] text-muted-foreground text-center">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>{message.content.replace("[SYSTEM]:", "").trim()}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex w-full group my-0.5", isSelf ? "justify-end" : "justify-start")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe to Reply Indicator */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-opacity duration-200",
          isSelf ? "right-2 text-primary" : "left-2 text-primary",
          Math.abs(swipeOffset) > 15 ? "opacity-100 scale-100" : "opacity-0 scale-75"
        )}
      >
        <div className="h-6 w-6 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center shadow-xs">
          <Reply className={cn("h-3 w-3 text-primary", isSelf ? "scale-x-[-1]" : "")} />
        </div>
      </div>

      <div
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? "transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)" : "none",
        }}
        className={cn(
          "relative flex items-center gap-1.5 transition-all max-w-[85%] sm:max-w-[65%]",
          isSelf ? "flex-row" : "flex-row-reverse"
        )}
      >
        {/* Visible 3-Dots Context Menu Trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded-full text-muted-foreground/70 hover:text-foreground bg-muted/30 hover:bg-muted/70 transition-all cursor-pointer shrink-0 shadow-2xs"
              title="Message options"
            >
              <MoreHorizontal className="h-3.5 w-3.5 stroke-[2.2]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isSelf ? "end" : "start"} className="rounded-2xl p-1.5 min-w-[150px] shadow-xl z-50">
            {onReply && (
              <DropdownMenuItem
                onClick={() => onReply(message)}
                className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
              >
                <Reply className="h-3.5 w-3.5 text-primary" /> Reply
              </DropdownMenuItem>
            )}
            {onForward && (
              <DropdownMenuItem
                onClick={() => onForward(message)}
                className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
              >
                <Forward className="h-3.5 w-3.5 text-indigo-500" /> Forward
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => handleCopyText(e)}
              className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" /> Copy {isImage ? "Image" : isAudio ? "Voice Note" : "Text"}
            </DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(message.id)}
                  className="rounded-xl text-xs font-bold text-destructive focus:text-destructive gap-2 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── BUBBLE CONTAINER WITH RIGHT CLICK & LONG PRESS CONTEXT MENU ── */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                "select-none cursor-pointer transition-all active:scale-[0.99] text-left",
                isImage && !imgError
                  ? "p-0 rounded-[18px] overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-xs"
                  : isAudio
                    ? "px-2.5 py-1 rounded-[18px] shadow-2xs"
                    : "px-3 py-1.5 rounded-[18px] shadow-2xs",
                isSelf
                  ? "rounded-tr-xs bg-primary text-primary-foreground font-normal"
                  : "rounded-tl-xs bg-[#eefbfe] dark:bg-[#0dcaf0]/12 text-slate-900 dark:text-slate-100 border border-[#0dcaf0]/25 shadow-2xs"
              )}
            >
              {/* 1. QUOTED REPLY BLOCK (Ultra-thin, clean preview) */}
              {replyData && (
                <div
                  className={cn(
                    "mb-1.5 p-1.5 px-2 rounded-xl border-l-2 text-left transition-opacity cursor-pointer",
                    isSelf
                      ? "bg-white/15 border-white/80 text-white/90"
                      : "bg-white/80 dark:bg-black/40 border-primary text-foreground"
                  )}
                >
                  <p className="font-bold text-[9.5px] uppercase tracking-wider opacity-90 leading-none">
                    {(replyData.sender && replyData.sender !== "null") ? replyData.sender : "Reply"}
                  </p>
                  <p className="truncate text-[11px] opacity-85 mt-0.5 leading-snug">
                    {(replyData.text && replyData.text !== "null") ? replyData.text : "Message"}
                  </p>
                </div>
              )}

              {/* 2. BID OFFER PAYLOAD */}
              {cleanContent.startsWith("[BID_OFFER]:") ? (() => {
                try {
                  const bid = JSON.parse(cleanContent.slice(12));
                  return (
                    <div className="space-y-2 text-xs min-w-[210px] p-0.5 text-left">
                      <div className="flex items-center justify-between border-b border-border/15 pb-1.5">
                        <span className="font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 opacity-90">
                          <Tag className="h-3 w-3" /> Escrow Offer
                        </span>
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                          bid.status === "accepted" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                          bid.status === "declined" ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30" : 
                          "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        )}>
                          {bid.status}
                        </span>
                      </div>

                      <p className="font-bold text-xs leading-tight text-foreground">{bid.product}</p>

                      <div className="grid grid-cols-2 gap-2 text-xs opacity-90">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider opacity-60">Unit Price</p>
                          <p className="font-black text-xs">₦{Number(bid.price).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider opacity-60">Quantity</p>
                          <p className="font-bold text-xs">{bid.quantity || 1} unit(s)</p>
                        </div>
                      </div>

                      {bid.notes && (
                        <div className="p-1.5 rounded-xl bg-background/50 border border-border/20 text-[10.5px] italic text-muted-foreground">
                          "{bid.notes}"
                        </div>
                      )}

                      {/* Action buttons if recipient */}
                      {!isSelf && bid.status === "pending" && (
                        <div className="flex gap-2 pt-1 border-t border-border/15">
                          {onAcceptBid && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAcceptBid(message.id, cleanContent);
                              }}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                            </button>
                          )}
                          {onDeclineBid && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeclineBid(message.id, cleanContent);
                              }}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1 border border-rose-500/30 transition-colors cursor-pointer"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Decline
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                } catch {
                  return <p className="text-xs">{cleanContent}</p>;
                }
              })() : cleanContent.startsWith("[SALE_CONFIRMATION]:") ? (() => {
                try {
                  const payload = JSON.parse(cleanContent.slice(20));
                  return (
                    <div className="space-y-2 text-xs min-w-[210px] p-1.5 text-left bg-background/50 rounded-xl border border-border/20">
                      <div className="flex items-center justify-between border-b border-border/15 pb-1.5">
                        <span className="font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 opacity-90">
                          Sale Verification
                        </span>
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                          payload.status === "confirmed" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                          "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        )}>
                          {payload.status}
                        </span>
                      </div>
                      
                      {payload.status === "pending" && !isSelf && (
                        <>
                          <p className="text-[11px] text-foreground font-medium">
                            Seller wants to verify this sale. Are you at the meetup spot?
                          </p>
                          {onConfirmSale && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onConfirmSale(message.id, payload);
                              }}
                              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 mt-2"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Received
                            </button>
                          )}
                        </>
                      )}
                      {payload.status === "confirmed" && (
                         <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                           <CheckCircle2 className="h-3.5 w-3.5" /> Sale Confirmed
                         </div>
                      )}
                    </div>
                  );
                } catch { return <span>Invalid Sale Data</span>; }
              })() : isAudio ? (
                /* 3. ULTRA-MINIMAL VOICE NOTE PLAYER */
                <AudioPlayer
                  src={cleanContent.replace("[AUDIO_NOTE]:", "").trim()}
                  isSelf={isSelf}
                  timestamp={formatMsgTime(message.created_at)}
                />
              ) : isImage && !imgError ? (
                /* 4. ULTRA-THIN FULL-BLEED IMAGE BUBBLE */
                <div
                  className="relative cursor-pointer group/img select-none overflow-hidden"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <img
                    src={maskedImageUrl}
                    alt="Chat attachment"
                    className="w-full max-h-[300px] min-h-[120px] object-cover transition-transform duration-300 group-hover/img:scale-[1.01] pointer-events-none"
                    loading="lazy"
                    onError={() => setImgError(true)}
                    onContextMenu={(e) => e.preventDefault()}
                  />

                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[9px] font-medium tracking-tight flex items-center gap-1 shadow-md pointer-events-none">
                    <span>{formatMsgTime(message.created_at)}</span>
                    {isSelf && (
                      message.read || message.read_at ? (
                        <CheckCheck className="h-2.5 w-2.5 text-cyan-300 stroke-[2.4]" />
                      ) : (
                        <Check className="h-2.5 w-2.5 opacity-80 stroke-[2]" />
                      )
                    )}
                  </div>
                </div>
              ) : isImage && imgError ? (
                /* IMAGE FALLBACK LINK */
                <a
                  href={maskedImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 p-1.5 rounded-xl bg-muted/40 border border-border/20 text-xs text-primary font-bold hover:underline"
                >
                  <ImageIcon className="h-3.5 w-3.5" /> View Photo Attachment
                </a>
              ) : (
                /* 5. ULTRA-SLEEK MINIMAL TEXT BUBBLE WITH COMPACT INLINE TIMESTAMP */
                <div className="text-[12px] leading-relaxed break-words">
                  <span>{cleanContent}</span>
                  <span className={cn(
                    "inline-flex items-center gap-0.5 float-right ml-2 mt-1 text-[9px] select-none font-mono tracking-tight",
                    isSelf ? "opacity-75" : "text-slate-500 dark:text-slate-400"
                  )}>
                    <span>{formatMsgTime(message.created_at)}</span>
                    {isSelf && (
                      message.read || message.read_at ? (
                        <CheckCheck className="h-3 w-3 text-cyan-200 stroke-[2.2]" />
                      ) : (
                        <Check className="h-3 w-3 opacity-80 stroke-[2]" />
                      )
                    )}
                  </span>
                </div>
              )}
            </div>
          </ContextMenuTrigger>

          {/* Context Menu Content Triggered by Right-Click (Desktop) & Long-Press (Mobile) */}
          <ContextMenuContent className="rounded-2xl p-1.5 min-w-[150px] shadow-2xl z-50">
            {onReply && (
              <ContextMenuItem
                onClick={() => onReply(message)}
                className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
              >
                <Reply className="h-3.5 w-3.5 text-primary" /> Reply
              </ContextMenuItem>
            )}
            {onForward && (
              <ContextMenuItem
                onClick={() => onForward(message)}
                className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
              >
                <Forward className="h-3.5 w-3.5 text-indigo-500" /> Forward
              </ContextMenuItem>
            )}
            <ContextMenuItem
              onClick={() => handleCopyText()}
              className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" /> Copy {isImage ? "Image" : isAudio ? "Voice Note" : "Text"}
            </ContextMenuItem>
            {onDelete && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => onDelete(message.id)}
                  className="rounded-xl text-xs font-bold text-destructive focus:text-destructive gap-2 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* FULL-SCREEN IMMERSIVE IMAGE VIEWER INSIDE STRING (No storage URLs, Clean Toolbar) */}
      {isImage && (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent className="max-w-[100vw] h-[100dvh] w-screen p-0 bg-black/95 border-none shadow-2xl backdrop-blur-2xl flex flex-col justify-between items-center z-[99999] rounded-none m-0">
            
            {/* Floating Top Right Action Menu */}
            <div className="absolute top-4 right-4 z-50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer shadow-xl border border-white/10"
                    title="Image options"
                  >
                    <MoreHorizontal className="h-5 w-5 stroke-[2.5]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl p-1.5 min-w-[160px] shadow-2xl z-[100000] bg-popover/95 backdrop-blur-xl border border-border/30">
                  {onReply && (
                    <DropdownMenuItem
                      onClick={() => {
                        setIsLightboxOpen(false);
                        onReply(message);
                      }}
                      className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
                    >
                      <Reply className="h-3.5 w-3.5 text-primary" /> Reply
                    </DropdownMenuItem>
                  )}
                  {onForward && (
                    <DropdownMenuItem
                      onClick={() => {
                        setIsLightboxOpen(false);
                        onForward(message);
                      }}
                      className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
                    >
                      <Forward className="h-3.5 w-3.5 text-indigo-500" /> Forward
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleCopyText()}
                    className="rounded-xl text-xs font-semibold gap-2 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy Image
                  </DropdownMenuItem>
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setIsLightboxOpen(false);
                          onDelete(message.id);
                        }}
                        className="rounded-xl text-xs font-bold text-destructive focus:text-destructive gap-2 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Center Image Container (Click to close) */}
            <div 
              className="flex-1 flex items-center justify-center p-4 w-full h-full overflow-hidden cursor-zoom-out"
              onClick={() => setIsLightboxOpen(false)}
            >
              <img
                src={maskedImageUrl}
                alt="Full size attachment"
                className="max-h-[82vh] max-w-[96vw] object-contain rounded-2xl shadow-2xl select-none pointer-events-none"
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
