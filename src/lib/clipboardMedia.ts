import { getMaskedAssetUrl } from "@/lib/assetMask";

/**
 * Universal Zero-Width Unicode Steganography
 * Allows copying sensitive voice notes or media tokens that paste invisibly (blank)
 * in external applications (Notes, Search bars, WhatsApp) but decode seamlessly inside String.
 */

const ZW_ZERO = "\u200B"; // Zero-width space = bit 0
const ZW_ONE = "\u200C";  // Zero-width non-joiner = bit 1
const ZW_PREFIX = "\uFEFF\u200D\uFEFF"; // String magic signature header

/**
 * Encode string into zero-width unicode characters
 */
export function encodeZeroWidth(text: string): string {
  const binary = Array.from(new TextEncoder().encode(text))
    .map((b) => b.toString(2).padStart(8, "0"))
    .join("");

  let zw = ZW_PREFIX;
  for (const bit of binary) {
    zw += bit === "1" ? ZW_ONE : ZW_ZERO;
  }
  return zw;
}

/**
 * Decode zero-width unicode string back to plain text
 */
export function decodeZeroWidth(text: string): string | null {
  if (!text || !text.includes(ZW_PREFIX)) return null;

  const startIdx = text.indexOf(ZW_PREFIX) + ZW_PREFIX.length;
  const zwContent = text.slice(startIdx);

  let binary = "";
  for (const char of zwContent) {
    if (char === ZW_ZERO) binary += "0";
    else if (char === ZW_ONE) binary += "1";
    else if (char === "\u200D" || char === "\uFEFF") continue;
    else break; // Stop at any standard visible character
  }

  if (binary.length === 0 || binary.length % 8 !== 0) return null;

  try {
    const bytes = new Uint8Array(binary.length / 8);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(binary.slice(i * 8, (i + 1) * 8), 2);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export interface VoiceNoteClipboardPayload {
  type: "STRING_VOICE_NOTE";
  url: string;
  duration?: number;
  timestamp?: number;
}

/**
 * Copy an Image to device clipboard as a binary image/png
 * so users can paste actual images across apps or inside String.
 */
export async function copyImageToClipboard(imageUrl: string): Promise<boolean> {
  try {
    // 1. Fetch image blob
    const response = await fetch(imageUrl, { mode: "cors" });
    const blob = await response.blob();

    // 2. Convert to standard PNG format for cross-device clipboard compatibility
    let pngBlob = blob;
    if (blob.type !== "image/png") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
      img.src = URL.createObjectURL(blob);
      await loadPromise;

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width || 300;
      canvas.height = img.naturalHeight || img.height || 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        pngBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b || blob), "image/png")
        );
      }
    }

    // 3. Write directly to clipboard as image/png
    if (navigator.clipboard && "write" in navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": pngBlob,
        }),
      ]);
      return true;
    }
  } catch (err) {
    console.warn("Direct image blob clipboard write failed, using secure masked fallback:", err);
  }

  // Fallback: Masked String asset URI (Never raw Supabase storage URLs)
  try {
    const masked = getMaskedAssetUrl(imageUrl);
    await navigator.clipboard.writeText(masked);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy Voice Note to clipboard encoded in Zero-Width Unicode.
 * External apps see a blank/invisible character, while String chat parses it as a voice note.
 */
export async function copyVoiceNoteToClipboard(audioUrl: string, duration?: number): Promise<boolean> {
  try {
    const payload: VoiceNoteClipboardPayload = {
      type: "STRING_VOICE_NOTE",
      url: audioUrl,
      duration: duration || 0,
      timestamp: Date.now(),
    };

    const encoded = encodeZeroWidth(JSON.stringify(payload));
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(encoded);
      return true;
    }
  } catch (err) {
    console.warn("Failed to copy voice note:", err);
  }
  return false;
}

/**
 * Parses pasted text/clipboard to detect if it is an encoded Voice Note
 */
export function parseVoiceNoteFromClipboard(text: string): VoiceNoteClipboardPayload | null {
  try {
    const decoded = decodeZeroWidth(text);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    if (parsed && parsed.type === "STRING_VOICE_NOTE" && parsed.url) {
      return parsed as VoiceNoteClipboardPayload;
    }
  } catch {
    return null;
  }
  return null;
}
