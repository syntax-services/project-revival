/**
 * INSTITUTIONAL GRADE SEO & AI SEARCH OPTIMIZATION ENGINE FOR STRING PLATFORM
 * Generates Schema.org JSON-LD Structured Data, Open Graph, Twitter Cards,
 * and canonical tags to maximize Google, Bing, and AI Engine (ChatGPT, Gemini, Perplexity) ranking.
 */

interface SEOProductPayload {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  businessName: string;
  category?: string;
  inStock?: boolean;
}

interface SEOMarketplacePayload {
  companyName: string;
  address?: string;
  rating?: number;
  phone?: string;
  imageUrl?: string;
  category?: string;
}

const PRIMARY_DOMAIN = "https://www.string.com.ng";
const DEFAULT_BRAND_IMAGE = "https://www.string.com.ng/String-logo-dark.png";

/**
 * Injects a highly structured Product JSON-LD block into document head.
 * Feeds search engines with precise catalog details to trigger Google Merchant rich snippets.
 */
export function injectProductSchema(product: SEOProductPayload) {
  if (typeof window === "undefined") return;

  const existingScript = document.getElementById("string-seo-product-schema");
  if (existingScript) {
    existingScript.remove();
  }

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": product.imageUrl || DEFAULT_BRAND_IMAGE,
    "description": product.description || `Buy ${product.name} on String - Nigeria's #1 verified campus marketplace.`,
    "sku": product.id,
    "mpn": product.id,
    "brand": {
      "@type": "Brand",
      "name": product.businessName || "String Merchant"
    },
    "offers": {
      "@type": "Offer",
      "url": `${PRIMARY_DOMAIN}/product/${product.id}`,
      "priceCurrency": "NGN",
      "price": product.price || 0,
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.inStock !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": product.businessName || "String Merchant"
      }
    }
  };

  const script = document.createElement("script");
  script.id = "string-seo-product-schema";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/**
 * Injects a LocalBusiness directory structured schema for the marketplace merchants directory.
 */
export function injectMarketplaceDirectorySchema(businesses: SEOMarketplacePayload[]) {
  if (typeof window === "undefined" || !businesses || businesses.length === 0) return;

  const existingScript = document.getElementById("string-seo-directory-schema");
  if (existingScript) {
    existingScript.remove();
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Verified Campus Businesses on String",
    "numberOfItems": businesses.length,
    "itemListElement": businesses.map((biz, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "item": {
        "@type": "Store",
        "name": biz.companyName,
        "image": biz.imageUrl || DEFAULT_BRAND_IMAGE,
        "telephone": biz.phone || "+2340000000",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": biz.address || "Nigeria",
          "addressLocality": biz.address || "Nigeria",
          "addressCountry": "NG"
        },
        "aggregateRating": biz.rating ? {
          "@type": "AggregateRating",
          "ratingValue": biz.rating,
          "bestRating": "5",
          "worstRating": "1",
          "ratingCount": "10"
        } : undefined
      }
    }))
  };

  const script = document.createElement("script");
  script.id = "string-seo-directory-schema";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/**
 * Supercharges page metadata (Keywords, Open Graph, Twitter Cards, robots guidelines) dynamically.
 */
export function updateMetaTags(
  title: string, 
  description: string, 
  keywords: string = "String, String Nigeria, campus marketplace, student commerce, buy and sell on campus, gadgets, textbooks, fashion, local services, verified merchants", 
  imageUrl: string = DEFAULT_BRAND_IMAGE
) {
  if (typeof window === "undefined") return;

  // 1. Update Title
  document.title = `${title} | String - Nigeria's #1 Campus Marketplace`;

  // Helper to upsert meta tags
  const setMeta = (nameOrProperty: string, value: string, isProperty = false) => {
    let el = isProperty 
      ? document.querySelector(`meta[property="${nameOrProperty}"]`)
      : document.querySelector(`meta[name="${nameOrProperty}"]`);
      
    if (!el) {
      el = document.createElement("meta");
      if (isProperty) {
        el.setAttribute("property", nameOrProperty);
      } else {
        el.setAttribute("name", nameOrProperty);
      }
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
  };

  // 2. Standard Search Meta Tags
  setMeta("description", description);
  setMeta("keywords", keywords);
  setMeta("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  setMeta("author", "String Inc.");
  setMeta("geo.region", "NG");
  setMeta("geo.placename", "Nigeria");

  // 3. Open Graph (Facebook / LinkedIn / AI crawlers previews)
  setMeta("og:title", `${title} | String Campus Marketplace`, true);
  setMeta("og:description", description, true);
  setMeta("og:image", imageUrl, true);
  setMeta("og:url", window.location.href, true);
  setMeta("og:type", "website", true);
  setMeta("og:site_name", "String", true);
  setMeta("og:locale", "en_NG", true);

  // 4. Twitter Cards
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:site", "@StringPlatform");
  setMeta("name", "twitter:creator", "@StringPlatform");
  setMeta("name", "twitter:title", `${title} | String`);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:image", imageUrl);

  // 5. Canonical Link
  let canonical = document.querySelector("link[rel='canonical']");
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", window.location.href);
}
