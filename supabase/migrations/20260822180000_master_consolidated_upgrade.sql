-- ============================================================================
-- MASTER CONSOLIDATED UPGRADE MIGRATION (NON-CONFLICTING & SAFE)
-- ============================================================================

-- 1. Safely drop dependent views first before column alters
DROP VIEW IF EXISTS public.public_businesses CASCADE;
DROP VIEW IF EXISTS public.public_profiles CASCADE;

-- 2. Ensure numeric types have sufficient precision to prevent numeric overflow
DO $$
BEGIN
  -- businesses table columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'reputation_score') THEN
    ALTER TABLE public.businesses ALTER COLUMN reputation_score TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'total_revenue') THEN
    ALTER TABLE public.businesses ALTER COLUMN total_revenue TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'pending_balance') THEN
    ALTER TABLE public.businesses ALTER COLUMN pending_balance TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'available_balance') THEN
    ALTER TABLE public.businesses ALTER COLUMN available_balance TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'latitude') THEN
    ALTER TABLE public.businesses ALTER COLUMN latitude TYPE DOUBLE PRECISION;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'longitude') THEN
    ALTER TABLE public.businesses ALTER COLUMN longitude TYPE DOUBLE PRECISION;
  END IF;

  -- profiles table columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'coupon_balance') THEN
    ALTER TABLE public.profiles ALTER COLUMN coupon_balance TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'points_balance') THEN
    ALTER TABLE public.profiles ALTER COLUMN points_balance TYPE NUMERIC(14,2);
  END IF;

  -- products table columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'price') THEN
    ALTER TABLE public.products ALTER COLUMN price TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'compare_at_price') THEN
    ALTER TABLE public.products ALTER COLUMN compare_at_price TYPE NUMERIC(14,2);
  END IF;

  -- orders table columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total') THEN
    ALTER TABLE public.orders ALTER COLUMN total TYPE NUMERIC(14,2);
  END IF;
END $$;

-- 3. Ensure images column exists on products
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'images') THEN
    ALTER TABLE public.products ADD COLUMN images TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 4. Recreate public views cleanly
CREATE OR REPLACE VIEW public.public_businesses AS
SELECT 
  id,
  user_id,
  company_name,
  industry,
  business_type,
  business_location,
  area_name,
  street_address,
  latitude,
  longitude,
  location_verified,
  verification_tier,
  reputation_score,
  is_active,
  logo_url,
  cover_image_url,
  created_at
FROM public.businesses
WHERE is_active = true;

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  user_id,
  full_name,
  avatar_url,
  user_type,
  verification_level,
  created_at
FROM public.profiles;

-- 5. Safe Account Deletion RPC
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Anonymize and deactivate businesses
  UPDATE public.businesses
  SET is_active = false,
      company_name = 'Deleted Account',
      description = NULL,
      website = NULL
  WHERE user_id = v_user_id;

  -- Delete customer records
  DELETE FROM public.customers WHERE user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.user_feedbacks WHERE user_id = v_user_id;

  -- Delete profile record
  DELETE FROM public.profiles WHERE user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
