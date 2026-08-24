import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "xml"; // 'xml' | 'json'

    // Fetch all active products
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        compare_at_price,
        image_url,
        images,
        category,
        tags,
        in_stock,
        stock_quantity,
        created_at,
        business:businesses(id, company_name, logo_url, business_location)
      `)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      throw error;
    }

    const domain = "https://www.string.com.ng";

    if (format === "json") {
      return new Response(JSON.stringify({ products: products || [] }, null, 2), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
        },
      });
    }

    // Generate Google Merchant Center / Facebook XML Feed
    const escapeXml = (unsafe: string) => {
      return (unsafe || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    let itemsXml = "";

    for (const p of products || []) {
      const biz = Array.isArray(p.business) ? p.business[0] : p.business;
      const brand = biz?.company_name || "String Merchant";
      const productLink = `${domain}/product/${p.id}`;
      const imageLink = p.image_url || `${domain}/String-logo-dark.png`;
      const priceStr = `${Number(p.price || 0).toFixed(2)} NGN`;
      const desc = escapeXml(p.description || `Buy ${p.name} from verified merchants on String.`);
      const title = escapeXml(p.name);
      const category = escapeXml(p.category || "General");

      itemsXml += `
    <item>
      <g:id>${p.id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${productLink}</g:link>
      <g:image_link>${imageLink}</g:image_link>
      <g:price>${priceStr}</g:price>
      <g:availability>${p.in_stock ? "in stock" : "out of stock"}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:product_type>${category}</g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>String Campus Marketplace Product Feed</title>
    <link>${domain}</link>
    <description>Verified student goods, gadgets, fashion, and campus essentials from String Marketplace</description>
    ${itemsXml}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to generate product feed" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
