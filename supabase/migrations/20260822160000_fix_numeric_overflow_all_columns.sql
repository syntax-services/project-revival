-- ============================================================================
-- FIX NUMERIC FIELD OVERFLOW ACROSS ALL REPUTATION, COMMISSION & PRICE COLUMNS
-- ============================================================================

-- 1. Temporarily drop dependent public views to allow column type alterations
DROP VIEW IF EXISTS public.public_businesses CASCADE;
DROP VIEW IF EXISTS public.public_profiles CASCADE;

-- 2. Alter Businesses columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'reputation_score'
  ) THEN
    ALTER TABLE public.businesses ALTER COLUMN reputation_score TYPE NUMERIC(12,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'available_balance'
  ) THEN
    ALTER TABLE public.businesses ALTER COLUMN available_balance TYPE NUMERIC(14,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'pending_balance'
  ) THEN
    ALTER TABLE public.businesses ALTER COLUMN pending_balance TYPE NUMERIC(14,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'total_withdrawn'
  ) THEN
    ALTER TABLE public.businesses ALTER COLUMN total_withdrawn TYPE NUMERIC(14,2);
  END IF;
END $$;

-- 3. Alter Products columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'commission_percent'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN commission_percent TYPE NUMERIC(12,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'price'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN price TYPE NUMERIC(14,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'compare_at_price'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN compare_at_price TYPE NUMERIC(14,2);
  END IF;
END $$;

-- 4. Alter Services columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'price_min'
  ) THEN
    ALTER TABLE public.services ALTER COLUMN price_min TYPE NUMERIC(14,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'price_max'
  ) THEN
    ALTER TABLE public.services ALTER COLUMN price_max TYPE NUMERIC(14,2);
  END IF;
END $$;

-- 5. Alter Orders columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN subtotal TYPE NUMERIC(14,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_fee'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN delivery_fee TYPE NUMERIC(14,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'platform_fee'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN platform_fee TYPE NUMERIC(14,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'commission_amount'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN commission_amount TYPE NUMERIC(14,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN total TYPE NUMERIC(14,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_distance_km'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN delivery_distance_km TYPE NUMERIC(14,2);
  END IF;
END $$;

-- 6. Recreate public views cleanly
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, user_id, full_name, user_type, avatar_url, latitude, longitude, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_businesses AS
SELECT 
    id, user_id, company_name, industry, company_size, years_in_operation, 
    business_location, website, business_goals, target_customer_type, 
    monthly_customer_volume, budget_range, marketing_channels, 
    products_services, operating_region, cover_image_url, logo_url, 
    description, reputation_score, total_reviews, total_completed_orders, 
    verified, verification_tier, business_type, is_active, created_at
FROM public.businesses
WHERE is_active = true;

GRANT SELECT ON public.public_businesses TO anon, authenticated;
