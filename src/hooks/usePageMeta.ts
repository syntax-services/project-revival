import { useEffect } from "react";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface PageMetaOptions {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: "website" | "profile" | "product" | "article" | "business.business";
  keywords?: string[];
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  breadcrumbs?: BreadcrumbItem[];
  canonicalUrl?: string;
  noindex?: boolean;
}

/**
 * Enterprise-Grade SEO & Structured Data (JSON-LD) Meta Synchronizer
 * Generates Schema.org rich snippets, OpenGraph, Twitter Cards, Sitelinks,
 * and canonical tags dynamically for top-tier Google and AI engine indexing.
 */
export function usePageMeta({
  title,
  description,
  image,
  url,
  type = "website",
  keywords,
  structuredData,
  breadcrumbs,
  canonicalUrl,
  noindex = false,
}: PageMetaOptions) {
  useEffect(() => {
    const siteName = "String | Nigeria's Verified Campus Marketplace";
    const baseTitle = "String | Campus Commerce, Local Marketplace & Services";
    const defaultDesc =
      "String connects university students, verified merchants, creators, and freelancers across Nigerian campuses for seamless discovery, direct chat, and local commerce.";
    const defaultImage = `${window.location.origin}/String-logo-dark.png`;
    const currentUrl = canonicalUrl || url || window.location.href;
    const finalTitle = title ? `${title} | String` : baseTitle;
    const finalDescription = description || defaultDesc;
    const finalImage = image || defaultImage;

    // 1. Update Document Title
    document.title = finalTitle;

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

    // Helper to set or create link tags (e.g. canonical)
    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", rel);
        document.head.appendChild(element);
      }
      element.setAttribute("href", href);
    };

    // Standard Meta Tags
    setMetaTag("name", "description", finalDescription);
    setMetaTag(
      "name",
      "keywords",
      keywords?.join(", ") ||
        "String, String Nigeria, String platform, campus marketplace, student business, verified merchants, university goods, buy and sell, freelance services, campus commerce, Naija campus market, Lagos, Ibadan, Abuja, UNILAG, UI, OAU, UNIBEN"
    );
    setMetaTag("name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    setMetaTag("name", "author", "String Platform (syntax-services/string)");
    setMetaTag("name", "publisher", "String Campus Marketplace");

    // Geo Targeting (Nigeria)
    setMetaTag("name", "geo.region", "NG");
    setMetaTag("name", "geo.placename", "Nigeria");
    setMetaTag("name", "target", "all");
    setMetaTag("name", "audience", "all");
    setMetaTag("name", "coverage", "Worldwide");
    setMetaTag("name", "distribution", "Global");
    setMetaTag("name", "rating", "General");

    // Canonical Tag
    setLinkTag("canonical", currentUrl);

    // OpenGraph Tags
    setMetaTag("property", "og:site_name", "String");
    setMetaTag("property", "og:title", title || baseTitle);
    setMetaTag("property", "og:description", finalDescription);
    setMetaTag("property", "og:image", finalImage);
    setMetaTag("property", "og:url", currentUrl);
    setMetaTag("property", "og:type", type);
    setMetaTag("property", "og:locale", "en_NG");

    // Twitter Card Tags
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:site", "@StringPlatform");
    setMetaTag("name", "twitter:creator", "@StringPlatform");
    setMetaTag("name", "twitter:title", title || baseTitle);
    setMetaTag("name", "twitter:description", finalDescription);
    setMetaTag("name", "twitter:image", finalImage);

    // 2. Structured Data (JSON-LD)
    const scriptId = "string-page-structured-data";
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;

    const allSchemas: Array<Record<string, unknown>> = [];

    // Optional Breadcrumb Schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      allSchemas.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      });
    }

    // Custom Page Structured Data
    if (structuredData) {
      if (Array.isArray(structuredData)) {
        allSchemas.push(...structuredData);
      } else {
        allSchemas.push(structuredData);
      }
    }

    if (allSchemas.length > 0) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = scriptId;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(allSchemas.length === 1 ? allSchemas[0] : allSchemas);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      document.title = baseTitle;
      const cleanupScript = document.getElementById(scriptId);
      if (cleanupScript) {
        cleanupScript.remove();
      }
    };
  }, [title, description, image, url, type, keywords, structuredData, breadcrumbs, canonicalUrl, noindex]);
}
