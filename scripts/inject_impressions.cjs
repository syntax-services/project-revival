const fs = require('fs');
let content = fs.readFileSync('src/pages/customer/CustomerOverview.tsx', 'utf8');

if (!content.includes('increment_product_impressions')) {
    content = content.replace(
      'const shuffled = shuffleArray(liveMapped);',
      'const shuffled = shuffleArray(liveMapped);\n\n        // Record impressions (TikTok-style analytics)\n        const productIds = liveMapped.map(p => p.id);\n        if (productIds.length > 0) {\n          supabase.rpc("increment_product_impressions", { product_ids: productIds }).catch(console.warn);\n        }'
    );
    fs.writeFileSync('src/pages/customer/CustomerOverview.tsx', content);
}
