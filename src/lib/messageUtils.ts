/**
 * Universal Message Sanitization & Parsing Utilities
 * Handles stripping nested reply tags, extracting clean human-readable snippets,
 * and preventing internal JSON or null leaking into user chat bubbles.
 */

export function extractCleanSnippet(content: string | null | undefined, maxLength: number = 60): string {
  if (!content) return "";
  let text = String(content).trim();
  if (!text || text === "null" || text === "undefined") return "";

  // Recursively strip all levels of [REPLY:...] tags
  while (text.startsWith("[REPLY:")) {
    const closingIdx = text.indexOf("]:");
    if (closingIdx !== -1) {
      text = text.slice(closingIdx + 2).trim();
    } else {
      // If broken JSON tag, remove it
      text = text.replace(/^\[REPLY:[^\]]+\]:/, "").trim();
      break;
    }
  }

  if (!text || text === "null" || text === "undefined") {
    return "Message";
  }

  // Check for voice note first
  if (text.startsWith("[AUDIO_NOTE]:") || text.includes(".webm") || text.includes(".m4a") || text.includes(".mp3")) {
    return "Voice note";
  }

  // Check for image attachment
  if (
    text.startsWith("[IMAGE]:") || 
    text.startsWith("[IMAGE]") || 
    (/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(text)) ||
    (text.includes("/chat-attachments/") && !text.includes(".webm") && !text.includes(".m4a"))
  ) {
    return "Photo attachment";
  }

  // Check for custom bid
  if (text.startsWith("[BID_OFFER]:")) {
    try {
      const b = JSON.parse(text.slice(12));
      return `Custom Bid: ${b.product} (₦${Number(b.price).toLocaleString()})`;
    } catch {
      return "Escrow Custom Bid";
    }
  }

  // Check for system notification
  if (text.startsWith("[SYSTEM]:")) {
    return text.replace("[SYSTEM]:", "").trim();
  }

  if (text.length > maxLength) {
    return text.slice(0, maxLength) + "...";
  }

  return text;
}
