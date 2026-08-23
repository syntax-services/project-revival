import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  imageUrl?: string | null;
  variant?: "icon" | "button" | "pill" | "subtle";
  className?: string;
  size?: "sm" | "default" | "icon";
  label?: string;
}

export function ShareButton({
  title,
  text,
  url,
  imageUrl,
  variant = "icon",
  className,
  size,
  label = "Share",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const shareUrl = url || window.location.href;
    const shareText = text || `Check out ${title} on String!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // If user cancelled, do not throw error
        if (err.name === "AbortError") return;
      }
    }

    // Fallback: Copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleShare}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 shadow-xs border",
          copied
            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            : "bg-muted/60 hover:bg-muted text-foreground border-border/30 hover:border-border/60",
          className
        )}
        title="Share"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        ) : (
          <Share2 className="h-3.5 w-3.5 shrink-0" />
        )}
        <span>{copied ? "Link Copied" : label}</span>
      </button>
    );
  }

  if (variant === "button") {
    return (
      <Button
        type="button"
        variant="outline"
        size={size || "sm"}
        onClick={handleShare}
        className={cn(
          "rounded-2xl text-xs font-bold gap-2 active:scale-95 transition-all",
          className
        )}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        ) : (
          <Share2 className="h-3.5 w-3.5 shrink-0" />
        )}
        <span>{copied ? "Copied" : label}</span>
      </Button>
    );
  }

  if (variant === "subtle") {
    return (
      <button
        type="button"
        onClick={handleShare}
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer active:scale-95",
          className
        )}
        title="Share"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
        ) : (
          <Share2 className="h-4 w-4 shrink-0" />
        )}
        <span className="text-[11px] font-semibold">{copied ? "Copied" : label}</span>
      </button>
    );
  }

  // Default: Minimal Icon Button
  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95",
        copied
          ? "bg-emerald-500/20 text-emerald-600"
          : "hover:bg-muted text-muted-foreground hover:text-foreground",
        className
      )}
      title="Share"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
    </button>
  );
}
