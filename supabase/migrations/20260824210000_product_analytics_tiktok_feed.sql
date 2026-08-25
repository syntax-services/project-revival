-- ==============================================================================
-- PRODUCT ANALYTICS & TIKTOK-STYLE FEED (IMPRESSIONS & CLICKS)
-- ==============================================================================
BEGIN;

-- 1. Add analytics columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;

-- 2. Create RPC functions for atomic increments without row locks holding up the app
CREATE OR REPLACE FUNCTION public.increment_product_impressions(product_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET impressions = impressions + 1
  WHERE id = ANY(product_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_product_clicks(p_product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET clicks = clicks + 1
  WHERE id = p_product_id;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.increment_product_impressions(UUID[]) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_product_clicks(UUID) TO authenticated, anon;

COMMIT;
-- ==============================================================================
-- TIKTOK-STYLE DISCOVERY ENGINE & INTELLIGENT MATCHING
-- ==============================================================================

-- Create a table to track user search terms for 'taste profiling'
CREATE TABLE IF NOT EXISTS public.user_taste_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RPC to get intelligent feed (combines random discovery + taste profiling + popularity)
CREATE OR REPLACE FUNCTION public.get_intelligent_feed(p_customer_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    price NUMERIC,
    image_url TEXT,
    images TEXT[],
    category TEXT,
    tags TEXT[],
    is_rare BOOLEAN,
    is_featured BOOLEAN,
    created_at TIMESTAMPTZ,
    business_id UUID,
    company_name TEXT,
    logo_url TEXT,
    verified BOOLEAN,
    is_active BOOLEAN,
    impressions INTEGER,
    clicks INTEGER,
    match_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_tastes AS (
    -- Extract top keywords the user has searched for
    SELECT unnest(string_to_array(lower(search_query), ' ')) as keyword
    FROM public.user_taste_profile
    WHERE customer_id = p_customer_id
    GROUP BY keyword
    ORDER BY count(*) DESC
    LIMIT 10
  ),
  scored_products AS (
    SELECT 
      p.*,
      b.company_name,
      b.logo_url,
      b.verified,
      b.is_active,
      -- Score calculation:
      -- 1. Base random factor (Explore - pushing to random people)
      (random() * 10) +
      -- 2. CTR factor (Exploit - pushing what works)
      (CASE WHEN p.impressions > 0 THEN (p.clicks::numeric / p.impressions::numeric) * 20 ELSE 0 END) +
      -- 3. Personalization factor (Taste Matching)
      (
        SELECT count(*) * 15
        FROM user_tastes ut
        WHERE lower(p.name) LIKE '%' || ut.keyword || '%'
           OR lower(p.category) LIKE '%' || ut.keyword || '%'
      ) as match_score
    FROM public.products p
    JOIN public.businesses b ON p.business_id = b.id
    WHERE p.in_stock = true AND b.is_active = true
  )
  SELECT 
    sp.id, sp.name, sp.description, sp.price, sp.image_url, sp.images, sp.category, sp.tags, sp.is_rare, sp.is_featured, sp.created_at,
    sp.business_id, sp.company_name, sp.logo_url, sp.verified, sp.is_active,
    sp.impressions, sp.clicks, sp.match_score
  FROM scored_products sp
  ORDER BY sp.match_score DESC, sp.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_intelligent_feed(UUID, INTEGER) TO authenticated, anon;
