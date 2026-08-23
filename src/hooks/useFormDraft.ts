import { useState, useEffect, useRef, useCallback } from "react";

export function useFormDraft<T extends Record<string, any>>(
  storageKey: string,
  initialValues: T
): [T, (updater: T | ((prev: T) => T)) => void, () => void, boolean] {
  const [draft, setDraftState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initialValues, ...parsed };
      }
    } catch (e) {
      console.warn(`Failed to restore draft for key "${storageKey}":`, e);
    }
    return initialValues;
  });

  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const setDraft = useCallback((updater: T | ((prev: T) => T)) => {
    setDraftState((prev) => {
      const next = typeof updater === "function" ? (updater as (prev: T) => T)(prev) : updater;
      
      // Debounce saving to localStorage
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          // Check if it has any non-empty value
          const hasValues = Object.values(next).some((val) => {
            if (val === null || val === undefined || val === "") return false;
            if (Array.isArray(val)) return val.length > 0;
            return true;
          });

          if (hasValues) {
            localStorage.setItem(storageKey, JSON.stringify(next));
            setHasDraft(true);
          } else {
            localStorage.removeItem(storageKey);
            setHasDraft(false);
          }
        } catch (e) {
          console.warn(`Failed to save draft to "${storageKey}":`, e);
        }
      }, 300);

      return next;
    });
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try {
      if (timerRef.current) clearTimeout(timerRef.current);
      localStorage.removeItem(storageKey);
      setDraftState(initialValues);
      setHasDraft(false);
    } catch (e) {
      console.warn(`Failed to clear draft for "${storageKey}":`, e);
    }
  }, [storageKey, initialValues]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return [draft, setDraft, clearDraft, hasDraft];
}
