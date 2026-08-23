import React from "react";
import { Building2, User, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatLastMessage } from "@/components/messages/messageUtils";
import { getMaskedAssetUrl } from "@/lib/assetMask";

export interface ConversationItemData {
  id: string;
  partnerId: string;
  partnerName: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  verified?: boolean;
  avatarUrl?: string;
}

interface ChatConversationItemProps {
  conversation: ConversationItemData;
  isSelected: boolean;
  onSelect: () => void;
  partnerType: "business" | "customer";
}

export function ChatConversationItem({
  conversation,
  isSelected,
  onSelect,
  partnerType,
}: ChatConversationItemProps) {
  const isUnread = conversation.unreadCount > 0;
  const [imgError, setImgError] = React.useState(false);

  const formatItemTime = (timestamp: string) => {
    try {
      const d = new Date(timestamp);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return format(d, "h:mm a");
      }
      return format(d, "MMM d");
    } catch {
      return "";
    }
  };

  const initial = conversation.partnerName?.trim()?.charAt(0)?.toUpperCase() || (partnerType === "business" ? "B" : "S");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full p-3.5 text-left rounded-2xl transition-all duration-200 cursor-pointer border border-transparent my-0.5",
        isSelected 
          ? "bg-muted/80 border-border/30 shadow-xs" 
          : "hover:bg-muted/40 hover:border-border/10",
        isUnread && !isSelected && "bg-card/70 border-border/20 shadow-xs"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative h-11 w-11 rounded-full bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center shrink-0 overflow-hidden border border-border/30 shadow-2xs">
          {conversation.avatarUrl && !imgError ? (
            <img 
              src={getMaskedAssetUrl(conversation.avatarUrl)} 
              alt={conversation.partnerName} 
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-xs font-black text-foreground/80 uppercase select-none">
              {initial}
            </span>
          )}

          {isUnread && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className={cn(
              "truncate flex items-center gap-1 text-xs",
              isUnread ? "font-black text-foreground" : "font-bold text-foreground"
            )}>
              {conversation.partnerName}
              {conversation.verified && (
                <ShieldCheck className="h-3.5 w-3.5 text-primary fill-primary/10 shrink-0" />
              )}
            </span>

            {conversation.lastMessageAt && (
              <span className={cn(
                "text-[10px] shrink-0",
                isUnread ? "font-bold text-primary" : "text-muted-foreground"
              )}>
                {formatItemTime(conversation.lastMessageAt)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              "text-xs truncate flex-1",
              isUnread 
                ? "font-black text-foreground" 
                : "text-muted-foreground font-medium"
            )}>
              {formatLastMessage(conversation.lastMessage || "") || "No messages yet"}
            </p>

            {isUnread && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-black text-primary-foreground flex items-center justify-center shrink-0 shadow-xs animate-in zoom-in">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
