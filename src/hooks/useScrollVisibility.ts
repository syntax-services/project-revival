import { useState, useEffect, useCallback } from "react";

export function useScrollVisibility(threshold = 10) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // At the top - always show
    if (currentScrollY < threshold) {
      setIsVisible(true);
      setLastScrollY(currentScrollY);
      return;
    }

    // Scrolling up - show
    if (currentScrollY < lastScrollY) {
      setIsVisible(true);
    } 
    // Scrolling down - hide
    else if (currentScrollY > lastScrollY + threshold) {
      setIsVisible(false);
    }

    setLastScrollY(currentScrollY);
  }, [lastScrollY, threshold]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return isVisible;
}
