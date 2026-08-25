const fs = require('fs');
let content = fs.readFileSync('src/pages/customer/CustomerDiscover.tsx', 'utf8');

if (!content.includes('track_user_taste')) {
    content = content.replace(
      '// Filter items',
      // Track user search taste\n  useEffect(() => {\n    if (search.trim().length > 2 && customer?.id) {\n      const timer = setTimeout(() => {\n        supabase.from('user_taste_profile').insert({\n          customer_id: customer.id,\n          search_query: search.trim(),\n          weight: 1\n        }).catch(console.warn);\n      }, 1500);\n      return () => clearTimeout(timer);\n    }\n  }, [search, customer?.id]);\n\n  // Filter items
    );
    fs.writeFileSync('src/pages/customer/CustomerDiscover.tsx', content);
}
