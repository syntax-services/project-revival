import { useEffect } from "react";

/**
 * Disabled swipe-gestural navigation to prevent scrolling/touch gesture conflicts
 * on mobile devices, ensuring zero page-split glitches and clean scrolling performance.
 */
export function useSwipeNavigation() {
  useEffect(() => {
    // No-op for stability
  }, []);
}
