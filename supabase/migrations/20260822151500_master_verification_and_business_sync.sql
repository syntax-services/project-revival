-- ============================================================================
-- STRING PLATFORM - MASTER REALTIME BUSINESS & LOCATION VERIFICATION SYNC
-- ============================================================================

-- 1. Ensure RLS policies for businesses, customers, location_requests are clean and unblocked
DROP POLICY IF EXISTS "Owners can view own business data" ON public.businesses;
DROP POLICY IF EXISTS "Business owner can insert" ON public.businesses;
DROP POLICY IF EXISTS "Business owner can update" ON public.businesses;
DROP POLICY IF EXISTS "Admins can manage all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Anyone can view active businesses" ON public.businesses;

CREATE POLICY "Anyone can view active businesses"
ON public.businesses FOR SELECT
USING (is_active = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Business owner can insert"
ON public.businesses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business owner can update"
ON public.businesses FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all businesses"
ON public.businesses FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure RLS on location_requests
DROP POLICY IF EXISTS "Users can view own location requests" ON public.location_requests;
DROP POLICY IF EXISTS "Users can create location requests" ON public.location_requests;
DROP POLICY IF EXISTS "Admins can manage location requests" ON public.location_requests;

CREATE POLICY "Users can view own location requests"
ON public.location_requests FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create location requests"
ON public.location_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage location requests"
ON public.location_requests FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Security definer helper to unconditionally get or provision business
CREATE OR REPLACE FUNCTION public.get_or_create_business()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_biz RECORD;
  v_user_name TEXT;
  v_req RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_biz FROM public.businesses WHERE user_id = v_user_id;

  IF v_biz.id IS NOT NULL THEN
    RETURN to_jsonb(v_biz);
  END IF;

  -- Fetch profile name
  SELECT full_name INTO v_user_name FROM public.profiles WHERE user_id = v_user_id;

  -- Fetch latest location request if any
  SELECT * INTO v_req FROM public.location_requests 
  WHERE user_id = v_user_id 
  ORDER BY created_at DESC 
  LIMIT 1;

  INSERT INTO public.businesses (
    user_id,
    company_name,
    industry,
    business_type,
    street_address,
    area_name,
    business_location,
    latitude,
    longitude,
    location_verified,
    verification_tier,
    is_active
  )
  VALUES (
    v_user_id,
    COALESCE(NULLIF(btrim(v_user_name), ''), 'Merchant Shop'),
    'Retail',
    'both'::public.business_type_enum,
    v_req.street_address,
    v_req.area_name,
    v_req.street_address,
    COALESCE(v_req.verified_latitude, v_req.latitude),
    COALESCE(v_req.verified_longitude, v_req.longitude),
    (v_req.status = 'verified'),
    CASE WHEN v_req.status = 'verified' THEN 'verified'::public.verification_tier ELSE 'none'::public.verification_tier END,
    true
  )
  ON CONFLICT (user_id) DO UPDATE
  SET is_active = true
  RETURNING * INTO v_biz;

  RETURN to_jsonb(v_biz);
END;
$$;

-- 3. Drop and recreate complete_onboarding_setup with clean signature
DROP FUNCTION IF EXISTS public.complete_onboarding_setup(text, text, text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.complete_onboarding_setup(
    p_full_name TEXT,
    p_phone TEXT,
    p_user_type TEXT,
    p_business_data JSONB DEFAULT NULL,
    p_customer_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_biz_id UUID;
    v_cust_id UUID;
    v_lat DOUBLE PRECISION;
    v_lng DOUBLE PRECISION;
    v_street TEXT;
    v_area TEXT;
    v_biz_location TEXT;
    v_company_name TEXT;
    v_biz_type public.business_type_enum;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

    -- Extract Coordinates & Addresses
    IF p_business_data IS NOT NULL THEN
        v_lat := COALESCE((p_business_data->>'latitude')::DOUBLE PRECISION, (p_business_data->>'lat')::DOUBLE PRECISION);
        v_lng := COALESCE((p_business_data->>'longitude')::DOUBLE PRECISION, (p_business_data->>'lng')::DOUBLE PRECISION);
        v_street := p_business_data->>'streetAddress';
        v_area := p_business_data->>'areaName';
        v_biz_location := COALESCE(p_business_data->>'businessLocation', v_street);
        v_company_name := COALESCE(NULLIF(p_business_data->>'companyName', ''), p_full_name, 'Merchant Shop');
        
        BEGIN
            v_biz_type := (p_business_data->>'businessType')::public.business_type_enum;
        EXCEPTION WHEN OTHERS THEN
            v_biz_type := 'both'::public.business_type_enum;
        END;
    ELSIF p_customer_data IS NOT NULL THEN
        v_lat := COALESCE((p_customer_data->>'latitude')::DOUBLE PRECISION, (p_customer_data->>'lat')::DOUBLE PRECISION);
        v_lng := COALESCE((p_customer_data->>'longitude')::DOUBLE PRECISION, (p_customer_data->>'lng')::DOUBLE PRECISION);
        v_street := p_customer_data->>'streetAddress';
        v_area := p_customer_data->>'areaName';
    END IF;

    -- Upsert Profile
    INSERT INTO public.profiles (
        user_id,
        full_name,
        email,
        phone,
        user_type,
        onboarding_completed,
        latitude,
        longitude,
        updated_at
    )
    VALUES (
        v_user_id,
        p_full_name,
        COALESCE(v_email, ''),
        p_phone,
        p_user_type,
        true,
        v_lat,
        v_lng,
        now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        user_type = EXCLUDED.user_type,
        onboarding_completed = true,
        latitude = COALESCE(EXCLUDED.latitude, profiles.latitude),
        longitude = COALESCE(EXCLUDED.longitude, profiles.longitude),
        updated_at = now();

    -- Upsert Business record
    IF p_user_type = 'business' OR p_business_data IS NOT NULL THEN
        INSERT INTO public.businesses (
            user_id,
            company_name,
            industry,
            business_type,
            street_address,
            area_name,
            business_location,
            latitude,
            longitude,
            location_verified,
            verification_tier,
            is_active,
            updated_at
        )
        VALUES (
            v_user_id,
            COALESCE(v_company_name, 'Merchant Shop'),
            COALESCE(p_business_data->>'industry', 'Retail'),
            COALESCE(v_biz_type, 'both'::public.business_type_enum),
            v_street,
            v_area,
            v_biz_location,
            v_lat,
            v_lng,
            (v_lat IS NOT NULL AND v_lng IS NOT NULL),
            'verified'::public.verification_tier,
            true,
            now()
        )
        ON CONFLICT (user_id) DO UPDATE
        SET
            company_name = COALESCE(EXCLUDED.company_name, businesses.company_name),
            business_type = COALESCE(EXCLUDED.business_type, businesses.business_type),
            street_address = COALESCE(EXCLUDED.street_address, businesses.street_address),
            area_name = COALESCE(EXCLUDED.area_name, businesses.area_name),
            business_location = COALESCE(EXCLUDED.business_location, businesses.business_location),
            latitude = COALESCE(EXCLUDED.latitude, businesses.latitude),
            longitude = COALESCE(EXCLUDED.longitude, businesses.longitude),
            location_verified = CASE 
                WHEN EXCLUDED.latitude IS NOT NULL THEN true 
                ELSE businesses.location_verified 
            END,
            updated_at = now()
        RETURNING id INTO v_biz_id;
    END IF;

    -- Upsert Customer record
    IF p_user_type = 'customer' OR p_customer_data IS NOT NULL THEN
        INSERT INTO public.customers (
            user_id,
            street_address,
            area_name,
            location,
            latitude,
            longitude,
            location_verified,
            updated_at
        )
        VALUES (
            v_user_id,
            v_street,
            v_area,
            COALESCE(v_street, v_area),
            v_lat,
            v_lng,
            (v_lat IS NOT NULL AND v_lng IS NOT NULL),
            now()
        )
        ON CONFLICT (user_id) DO UPDATE
        SET
            street_address = COALESCE(EXCLUDED.street_address, customers.street_address),
            area_name = COALESCE(EXCLUDED.area_name, customers.area_name),
            location = COALESCE(EXCLUDED.location, customers.location),
            latitude = COALESCE(EXCLUDED.latitude, customers.latitude),
            longitude = COALESCE(EXCLUDED.longitude, customers.longitude),
            location_verified = CASE 
                WHEN EXCLUDED.latitude IS NOT NULL THEN true 
                ELSE customers.location_verified 
            END,
            updated_at = now()
        RETURNING id INTO v_cust_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'business_id', v_biz_id,
        'customer_id', v_cust_id
    );
END;
$$;

-- 4. Automatic Location Verification Trigger Function
CREATE OR REPLACE FUNCTION public.sync_location_request_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_user_phone TEXT;
  v_user_type TEXT;
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
BEGIN
  v_lat := COALESCE(NEW.verified_latitude, NEW.latitude);
  v_lng := COALESCE(NEW.verified_longitude, NEW.longitude);

  -- Fetch user profile info
  SELECT full_name, phone, user_type
  INTO v_user_name, v_user_phone, v_user_type
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF NEW.status = 'verified' THEN
    -- Upsert businesses row
    INSERT INTO public.businesses (
      user_id,
      company_name,
      industry,
      business_type,
      street_address,
      area_name,
      business_location,
      latitude,
      longitude,
      location_verified,
      verification_tier,
      is_active,
      updated_at
    )
    VALUES (
      NEW.user_id,
      COALESCE(NULLIF(btrim(v_user_name), ''), 'Merchant Shop'),
      'Retail',
      'both'::public.business_type_enum,
      NEW.street_address,
      NEW.area_name,
      NEW.street_address,
      v_lat,
      v_lng,
      true,
      'verified'::public.verification_tier,
      true,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      location_verified = true,
      street_address = COALESCE(EXCLUDED.street_address, businesses.street_address),
      area_name = COALESCE(EXCLUDED.area_name, businesses.area_name),
      business_location = COALESCE(EXCLUDED.business_location, businesses.business_location),
      latitude = COALESCE(EXCLUDED.latitude, businesses.latitude),
      longitude = COALESCE(EXCLUDED.longitude, businesses.longitude),
      updated_at = now();

    -- Upsert customers row
    INSERT INTO public.customers (
      user_id,
      street_address,
      area_name,
      location,
      latitude,
      longitude,
      location_verified,
      updated_at
    )
    VALUES (
      NEW.user_id,
      NEW.street_address,
      NEW.area_name,
      NEW.street_address,
      v_lat,
      v_lng,
      true,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      location_verified = true,
      street_address = COALESCE(EXCLUDED.street_address, customers.street_address),
      area_name = COALESCE(EXCLUDED.area_name, customers.area_name),
      location = COALESCE(EXCLUDED.location, customers.location),
      latitude = COALESCE(EXCLUDED.latitude, customers.latitude),
      longitude = COALESCE(EXCLUDED.longitude, customers.longitude),
      updated_at = now();

    -- Update profiles table
    UPDATE public.profiles
    SET
      onboarding_completed = true,
      latitude = COALESCE(v_lat, profiles.latitude),
      longitude = COALESCE(v_lng, profiles.longitude),
      updated_at = now()
    WHERE user_id = NEW.user_id;

  ELSIF NEW.status = 'rejected' THEN
    UPDATE public.businesses
    SET
      location_verified = false,
      updated_at = now()
    WHERE user_id = NEW.user_id;

    UPDATE public.customers
    SET
      location_verified = false,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Bind trigger to location_requests
DROP TRIGGER IF EXISTS trigger_sync_location_request_verification ON public.location_requests;
CREATE TRIGGER trigger_sync_location_request_verification
AFTER INSERT OR UPDATE OF status, verified_latitude, verified_longitude, latitude, longitude ON public.location_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_location_request_verification();

-- 6. Comprehensive Immediate Database Backfill
DO $$
DECLARE
  r RECORD;
  p RECORD;
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_name TEXT;
BEGIN
  -- Backfill from verified location requests
  FOR r IN (
    SELECT * FROM public.location_requests
    WHERE status = 'verified'
  )
  LOOP
    v_lat := COALESCE(r.verified_latitude, r.latitude);
    v_lng := COALESCE(r.verified_longitude, r.longitude);
    SELECT full_name INTO v_name FROM public.profiles WHERE user_id = r.user_id;

    INSERT INTO public.businesses (
      user_id,
      company_name,
      industry,
      business_type,
      street_address,
      area_name,
      business_location,
      latitude,
      longitude,
      location_verified,
      verification_tier,
      is_active,
      updated_at
    )
    VALUES (
      r.user_id,
      COALESCE(NULLIF(btrim(v_name), ''), 'Merchant Shop'),
      'Retail',
      'both'::public.business_type_enum,
      r.street_address,
      r.area_name,
      r.street_address,
      v_lat,
      v_lng,
      true,
      'verified'::public.verification_tier,
      true,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      location_verified = true,
      street_address = COALESCE(EXCLUDED.street_address, businesses.street_address),
      area_name = COALESCE(EXCLUDED.area_name, businesses.area_name),
      business_location = COALESCE(EXCLUDED.business_location, businesses.business_location),
      latitude = COALESCE(EXCLUDED.latitude, businesses.latitude),
      longitude = COALESCE(EXCLUDED.longitude, businesses.longitude),
      updated_at = now();

    UPDATE public.profiles
    SET
      onboarding_completed = true,
      latitude = COALESCE(v_lat, profiles.latitude),
      longitude = COALESCE(v_lng, profiles.longitude),
      updated_at = now()
    WHERE user_id = r.user_id;
  END LOOP;

  -- Ensure any profile marked as business or completed onboarding has a business row
  FOR p IN (
    SELECT * FROM public.profiles
    WHERE user_type = 'business' OR onboarding_completed = true
  )
  LOOP
    INSERT INTO public.businesses (
      user_id,
      company_name,
      industry,
      business_type,
      latitude,
      longitude,
      location_verified,
      verification_tier,
      is_active,
      updated_at
    )
    VALUES (
      p.user_id,
      COALESCE(NULLIF(btrim(p.full_name), ''), 'Merchant Shop'),
      'Retail',
      'both'::public.business_type_enum,
      p.latitude,
      p.longitude,
      (p.latitude IS NOT NULL AND p.longitude IS NOT NULL),
      'verified'::public.verification_tier,
      true,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      company_name = COALESCE(businesses.company_name, EXCLUDED.company_name),
      is_active = true,
      updated_at = now();
  END LOOP;
END $$;

-- 7. Ensure All Numeric Columns Have Safe High Precision (Prevent Numeric Overflow)
DROP VIEW IF EXISTS public.public_businesses CASCADE;
DROP VIEW IF EXISTS public.public_profiles CASCADE;

DO $$
BEGIN
  -- Businesses
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'reputation_score') THEN
    ALTER TABLE public.businesses ALTER COLUMN reputation_score TYPE NUMERIC(12,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'available_balance') THEN
    ALTER TABLE public.businesses ALTER COLUMN available_balance TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'pending_balance') THEN
    ALTER TABLE public.businesses ALTER COLUMN pending_balance TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'total_withdrawn') THEN
    ALTER TABLE public.businesses ALTER COLUMN total_withdrawn TYPE NUMERIC(14,2);
  END IF;

  -- Products
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'commission_percent') THEN
    ALTER TABLE public.products ALTER COLUMN commission_percent TYPE NUMERIC(12,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'price') THEN
    ALTER TABLE public.products ALTER COLUMN price TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'compare_at_price') THEN
    ALTER TABLE public.products ALTER COLUMN compare_at_price TYPE NUMERIC(14,2);
  END IF;

  -- Services
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'price_min') THEN
    ALTER TABLE public.services ALTER COLUMN price_min TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'price_max') THEN
    ALTER TABLE public.services ALTER COLUMN price_max TYPE NUMERIC(14,2);
  END IF;

  -- Orders
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'subtotal') THEN
    ALTER TABLE public.orders ALTER COLUMN subtotal TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_fee') THEN
    ALTER TABLE public.orders ALTER COLUMN delivery_fee TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'platform_fee') THEN
    ALTER TABLE public.orders ALTER COLUMN platform_fee TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'commission_amount') THEN
    ALTER TABLE public.orders ALTER COLUMN commission_amount TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total') THEN
    ALTER TABLE public.orders ALTER COLUMN total TYPE NUMERIC(14,2);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_distance_km') THEN
    ALTER TABLE public.orders ALTER COLUMN delivery_distance_km TYPE NUMERIC(14,2);
  END IF;
END $$;

-- Recreate public views
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


