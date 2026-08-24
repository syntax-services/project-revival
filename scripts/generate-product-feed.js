import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Use the public anon key for safe fetching of active products
const SUPABASE_URL = "https://kxynwcuhgawnhqoexpti.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4eW53Y3VoZ2F3bmhxb2V4cHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDAxNDYsImV4cCI6MjA4NTUxNjE0Nn0.W7p6v78dZBMGKIYWlrnFWMeSgzVHXWXSapudY-qgAEI";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const domain = "https://www.string.com.ng";

const escapeXml = (unsafe) => {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

async function generateFeed() {
  console.log("Generating XML Product Feed from live Supabase database...");
  
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        category,
        in_stock,
        business:businesses(company_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    let itemsXml = "";

    if (products && products.length > 0) {
      for (const p of products) {
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
    } else {
      // Fallback empty feed so Google doesn't crash if database is empty
      itemsXml = `
    <item>
      <g:id>string-launch</g:id>
      <g:title>String Campus Marketplace</g:title>
      <g:description>Discover authentic verified goods across Nigerian universities.</g:description>
      <g:link>https://www.string.com.ng</g:link>
      <g:image_link>https://www.string.com.ng/String-logo-dark.png</g:image_link>
      <g:price>0.00 NGN</g:price>
      <g:availability>in stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand>String</g:brand>
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

    const outputPath = path.resolve(process.cwd(), 'public/product-feed.xml');
    fs.writeFileSync(outputPath, xml, 'utf8');
    
    console.log(`✅ Successfully generated product-feed.xml with ${products?.length || 0} items at ${outputPath}`);
  } catch (err) {
    console.error("❌ Failed to generate product feed:", err);
    process.exit(1);
  }
}

generateFeed();
