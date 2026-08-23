-- ============================================================================
-- STRING PLATFORM - AUTOMATIC LOCATION VERIFICATION TRIGGER & BACKFILL
-- Automatically syncs location_requests verification state to businesses & customers.
-- ============================================================================

-- 1. Create the sync trigger function
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
    -- If it is a business request
    IF NEW.user_type = 'business' OR v_user_type = 'business' THEN
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
        NEW.user_id,
        COALESCE(NULLIF(btrim(v_user_name), ''), 'Merchant Shop'),
        'Retail',
        'both',
        NEW.street_address,
        NEW.area_name,
        NEW.street_address,
        v_lat,
        v_lng,
        true,
        'verified',
        true
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

      -- Update profiles table
      UPDATE public.profiles
      SET
        onboarding_completed = true,
        latitude = COALESCE(v_lat, profiles.latitude),
        longitude = COALESCE(v_lng, profiles.longitude),
        updated_at = now()
      WHERE user_id = NEW.user_id;

    ELSE
      -- Customer request
      INSERT INTO public.customers (
        user_id,
        street_address,
        area_name,
        location,
        latitude,
        longitude,
        location_verified
      )
      VALUES (
        NEW.user_id,
        NEW.street_address,
        NEW.area_name,
        NEW.street_address,
        v_lat,
        v_lng,
        true
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
    END IF;

  ELSIF NEW.status = 'rejected' THEN
    IF NEW.user_type = 'business' THEN
      UPDATE public.businesses
      SET
        location_verified = false,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      UPDATE public.customers
      SET
        location_verified = false,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Bind the trigger to location_requests table
DROP TRIGGER IF EXISTS trigger_sync_location_request_verification ON public.location_requests;
CREATE TRIGGER trigger_sync_location_request_verification
AFTER INSERT OR UPDATE OF status, verified_latitude, verified_longitude, latitude, longitude ON public.location_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_location_request_verification();

-- 3. Immediate Data Backfill for all existing verified location requests
DO $$
DECLARE
  r RECORD;
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_user_name TEXT;
BEGIN
  FOR r IN (
    SELECT * FROM public.location_requests
    WHERE status = 'verified'
  )
  LOOP
    v_lat := COALESCE(r.verified_latitude, r.latitude);
    v_lng := COALESCE(r.verified_longitude, r.longitude);

    SELECT full_name INTO v_user_name FROM public.profiles WHERE user_id = r.user_id;

    IF r.user_type = 'business' THEN
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
        r.user_id,
        COALESCE(NULLIF(btrim(v_user_name), ''), 'Merchant Shop'),
        'Retail',
        'both',
        r.street_address,
        r.area_name,
        r.street_address,
        v_lat,
        v_lng,
        true,
        'verified',
        true
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

    ELSE
      INSERT INTO public.customers (
        user_id,
        street_address,
        area_name,
        location,
        latitude,
        longitude,
        location_verified
      )
      VALUES (
        r.user_id,
        r.street_address,
        r.area_name,
        r.street_address,
        v_lat,
        v_lng,
        true
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

      UPDATE public.profiles
      SET
        onboarding_completed = true,
        latitude = COALESCE(v_lat, profiles.latitude),
        longitude = COALESCE(v_lng, profiles.longitude),
        updated_at = now()
      WHERE user_id = r.user_id;
    END IF;
  END LOOP;
END $$;
