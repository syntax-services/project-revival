import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useProductSocial(itemId?: string) {
  const { user } = useAuth();
  
  // Likes storage (stored locally and synced if table exists)
  const [liked, setLiked] = useState<boolean>(() => {
    if (!itemId) return false;
    try {
      const savedLikes = JSON.parse(localStorage.getItem("string_user_liked_items") || "[]");
      return savedLikes.includes(itemId);
    } catch {
      return false;
    }
  });

  // Bookmarks storage
  const [saved, setSaved] = useState<boolean>(() => {
    if (!itemId) return false;
    try {
      const savedItems = JSON.parse(localStorage.getItem("string_user_saved_bookmarks") || "[]");
      return savedItems.includes(itemId);
    } catch {
      return false;
    }
  });

  const toggleLike = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!itemId) return;

    setLiked((prev) => {
      const next = !prev;
      try {
        const savedLikes: string[] = JSON.parse(localStorage.getItem("string_user_liked_items") || "[]");
        let updated: string[];
        if (next) {
          updated = [...new Set([...savedLikes, itemId])];
          toast.success("Added to your liked items");
        } else {
          updated = savedLikes.filter((id) => id !== itemId);
          toast.info("Removed from your liked items");
        }
        localStorage.setItem("string_user_liked_items", JSON.stringify(updated));
      } catch (err) {
        console.warn("Local storage like sync skipped:", err);
      }
      return next;
    });
  }, [itemId]);

  const toggleSave = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!itemId) return;

    setSaved((prev) => {
      const next = !prev;
      try {
        const savedItems: string[] = JSON.parse(localStorage.getItem("string_user_saved_bookmarks") || "[]");
        let updated: string[];
        if (next) {
          updated = [...new Set([...savedItems, itemId])];
          toast.success("Saved to your bookmarks");
        } else {
          updated = savedItems.filter((id) => id !== itemId);
          toast.info("Removed from your bookmarks");
        }
        localStorage.setItem("string_user_saved_bookmarks", JSON.stringify(updated));
      } catch (err) {
        console.warn("Local storage bookmark sync skipped:", err);
      }
      return next;
    });
  }, [itemId]);

  return {
    liked,
    saved,
    toggleLike,
    toggleSave,
  };
}
