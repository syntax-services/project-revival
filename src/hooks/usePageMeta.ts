import { useEffect } from "react";

interface PageMetaOptions {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: "website" | "profile" | "product" | "article";
}

/**
 * Dynamic SEO & OpenGraph / Twitter metadata updater
 * Automatically synchronizes DOM meta tags for link previews and social shares.
 */
export function usePageMeta({
  title,
  description,
  image,
  url,
  type = "website",
}: PageMetaOptions) {
  useEffect(() => {
    // 1. Update Document Title
    const baseTitle = "String | Verified Campus Commerce";
    document.title = title ? `${title} | String` : baseTitle;

    // Helper to safely set or create a meta tag
    const setMetaTag = (attrName: "name" | "property", attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    const currentUrl = url || window.location.href;
    const finalDescription = description || "Discover verified campus merchants, exclusive goods, and student services on String.";
    const finalImage = image || `${window.location.origin}/placeholder.svg`;

    // Standard Descriptions
    setMetaTag("name", "description", finalDescription);

    // OpenGraph Tags
    setMetaTag("property", "og:title", title || baseTitle);
    setMetaTag("property", "og:description", finalDescription);
    setMetaTag("property", "og:image", finalImage);
    setMetaTag("property", "og:url", currentUrl);
    setMetaTag("property", "og:type", type);
    setMetaTag("property", "og:site_name", "String Campus Marketplace");

    // Twitter Card Tags
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", title || baseTitle);
    setMetaTag("name", "twitter:description", finalDescription);
    setMetaTag("name", "twitter:image", finalImage);

    return () => {
      // Revert to default base title when unmounted
      document.title = baseTitle;
    };
  }, [title, description, image, url, type]);
}
