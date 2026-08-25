const fs = require('fs');
let content = fs.readFileSync('src/pages/discover/ProductDetailPage.tsx', 'utf8');

const targetStr = 'if (data) {\n            setProduct(data as any);\n          }';
const replacement = if (data) {
            setProduct(data as any);
            
            // Track Click & Taste Profile (TikTok-style analytics)
            supabase.rpc('increment_product_clicks', { p_product_id: data.id }).catch(console.warn);
            
            if (user?.id) {
              // Track category preference
              if (data.category) {
                supabase.from('user_taste_profile').insert({
                  customer_id: user.id,
                  search_query: data.category,
                  weight: 2 // Higher weight for clicks vs searches
                }).catch(console.warn);
              }
              // Track tag preferences
              if (data.tags && data.tags.length > 0) {
                const tagInserts = data.tags.map(tag => ({
                  customer_id: user.id,
                  search_query: tag,
                  weight: 1
                }));
                supabase.from('user_taste_profile').insert(tagInserts).catch(console.warn);
              }
            }
          };

if (content.includes('setProduct(data as any);')) {
  content = content.replace(targetStr, replacement);
  fs.writeFileSync('src/pages/discover/ProductDetailPage.tsx', content);
}
