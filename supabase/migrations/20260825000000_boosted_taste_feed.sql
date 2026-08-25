-- ==============================================================================
-- UPDATE TIKTOK ALGORITHM FOR BOOSTED BUSINESSES ONLY
-- ==============================================================================
BEGIN;

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
    -- Extract top keywords the user has clicked or searched for
    SELECT unnest(string_to_array(lower(search_query), ' ')) as keyword
    FROM public.user_taste_profile
    WHERE customer_id = p_customer_id
    GROUP BY keyword
    ORDER BY sum(weight) DESC
    LIMIT 15
  ),
  boosted_businesses AS (
    -- Get businesses with an active booster subscription
    SELECT business_id
    FROM public.premium_subscriptions
    WHERE expires_at > now()
  ),
  scored_products AS (
    SELECT 
      p.*,
      b.company_name,
      b.logo_url,
      b.verified,
      b.is_active,
      -- Score calculation for BOOSTED products only:
      -- 1. Base random factor
      (random() * 10) +
      -- 2. CTR factor
      (CASE WHEN p.impressions > 0 THEN (p.clicks::numeric / p.impressions::numeric) * 20 ELSE 0 END) +
      -- 3. Personalization factor (Taste Matching)
      (
        SELECT COALESCE(sum(50), 0) -- massive boost for match
        FROM user_tastes ut
        WHERE lower(p.name) LIKE '%' || ut.keyword || '%'
           OR lower(p.category) LIKE '%' || ut.keyword || '%'
           OR lower(array_to_string(p.tags, ' ')) LIKE '%' || ut.keyword || '%'
      ) as match_score
    FROM public.products p
    JOIN public.businesses b ON p.business_id = b.id
    JOIN boosted_businesses bb ON b.id = bb.business_id
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
COMMIT;
