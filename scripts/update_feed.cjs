const fs = require('fs');
const path = 'src/pages/customer/CustomerOverview.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacement1 =       setLoading(true);
      try {
        // 0. Query BOOSTED products using the intelligent matching algorithm!
        const { data: boostedData } = await supabase
          .rpc('get_intelligent_feed', { p_customer_id: customer?.id || null, p_limit: 10 });
        
        const boostedProductIds = (boostedData || []).map((p: any) => p.id);

        // 1. Query normal live active products from database
        const { data: dbProducts, error: prodErr } = await supabase
          .from("products");
content = content.replace(/      setLoading\(true\);\s*try \{\s*\/\/\ 1\.\ Query live active products from database\s*const \{ data: dbProducts, error: prodErr \} = await supabase\s*\.from\("products"\)/, replacement1);


const replacement2 =         // Map Boosted Products
        const boostedItems = (boostedData || []).map((p: any) => ({
          id: p.id,
          type: "product",
          name: p.name,
          description: p.description,
          price: p.price,
          image_url: p.image_url || (Array.isArray(p.images) && p.images[0]) || null,
          images: p.images || (p.image_url ? [p.image_url] : []),
          category: p.category || "Other",
          tags: p.tags || [],
          business: {
            id: p.business_id,
            name: p.company_name,
            avatar: p.logo_url,
            verified: p.verified,
          },
          likes: p.likes || 0,
          comments: p.comments || 0,
          shares: p.shares || 0,
          isRare: p.is_rare,
          isBoosted: true, // Special flag for UI
          timestamp: new Date(p.created_at).getTime(),
        }));

        const productItems = (dbProducts || [])
          .filter((p: any) => p.businesses?.is_active && !boostedProductIds.includes(p.id)) // Exclude boosted to prevent duplicates
          .map((p: any) => ({;
content = content.replace(/        const productItems = \(dbProducts \|\| \[\]\)\s*\.filter\(\(p: any\) => p\.businesses\?\.is_active\)\s*\.map\(\(p: any\) => \(\{/, replacement2);


const replacement3 =         // Combine: Boosted first, then others (newest first)
        const normalCombined = [...productItems, ...serviceItems].sort((a, b) => b.timestamp - a.timestamp);
        const combined = [...boostedItems, ...normalCombined];
        
        setItems(combined);;
content = content.replace(/        \/\/ Combine and sort \(newest first\)\s*const combined = \[\.\.\.productItems, \.\.\.serviceItems\]\.sort\(\(a, b\) => b\.timestamp - a\.timestamp\);\s*setItems\(combined\);/, replacement3);

fs.writeFileSync(path, content);
console.log("Updated CustomerOverview.tsx");
