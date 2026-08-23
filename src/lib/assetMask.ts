/**
 * Asset Masking & Security Sanitization Utilities
 * Prevents raw storage bucket URLs, project endpoints, and internal technical errors
 * from leaking into the UI, DOM, or clipboard.
 */

const SUPABASE_STORAGE_REGEX = /https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/([^/]+)\/(.+)/i;

/**
 * Cleanly mask and format storage assets.
 * Returns empty string if no valid URL provided (preventing broken placeholder loads).
 */
export function getMaskedAssetUrl(url: string | null | undefined, fallback: string = ""): string {
  if (!url || typeof url !== "string" || !url.trim()) {
    return fallback;
  }

  const trimmed = url.trim();

  // If already a blob/data URL or relative asset, return as-is
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:") || trimmed.startsWith("/")) {
    return trimmed;
  }

  // Check if it's a valid remote URL
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return fallback;
  }
}

/**
 * Masks raw backend storage URLs into user-facing String asset links
 * e.g., converts https://*.supabase.co/.../img_123.jpg into https://string.app/assets/chat/img_123.jpg
 */
export function getMaskedShareUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();

  const match = trimmed.match(SUPABASE_STORAGE_REGEX);
  if (match) {
    const [, bucket, path] = match;
    const filename = path.split("/").pop() || "media";
    return `https://string.app/assets/${bucket}/${filename}`;
  }

  return trimmed;
}

/**
 * Filter out sensitive database/infrastructure terms from error messages shown to users.
 */
export function sanitizeUserFacingError(error: unknown, fallbackMessage = "Something went wrong. Please try again."): string {
  if (!error) return fallbackMessage;

  const rawMsg = typeof error === "string" 
    ? error 
    : error instanceof Error 
      ? error.message 
      : typeof (error as any)?.message === "string" 
        ? (error as any).message 
        : "";

  if (!rawMsg) return fallbackMessage;

  // Check for common technical/database keywords to mask
  const technicalKeywords = [
    "PostgREST", "PostgreSQL", "relation", "violates foreign key", "column", 
    "syntax error", "JWT", "RLS", "row-level security", "auth.users", 
    "duplicate key value", "null value in column", "numeric field overflow",
    "invalid input syntax for type", "permission denied", "0A000", "42P01", "updated_at"
  ];

  const hasTechnicalTerm = technicalKeywords.some(term => 
    rawMsg.toLowerCase().includes(term.toLowerCase())
  );

  if (hasTechnicalTerm) {
    if (rawMsg.toLowerCase().includes("duplicate") || rawMsg.toLowerCase().includes("already exists")) {
      return "This record already exists. Please choose a different name or detail.";
    }
    if (rawMsg.toLowerCase().includes("permission") || rawMsg.toLowerCase().includes("security")) {
      return "You do not have permission to perform this action.";
    }
    if (rawMsg.toLowerCase().includes("numeric") || rawMsg.toLowerCase().includes("overflow")) {
      return "Please enter a valid amount within normal limits.";
    }
    return fallbackMessage;
  }

  return rawMsg;
}
