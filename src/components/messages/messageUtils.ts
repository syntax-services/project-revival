import { extractCleanSnippet } from "@/lib/messageUtils";

export const formatLastMessage = (content: string | null | undefined): string => {
  if (!content || content === "null" || content === "undefined") return "";
  const cleaned = extractCleanSnippet(content, 45);
  if (!cleaned || cleaned === "null" || cleaned === "undefined") return "";
  return cleaned;
};
