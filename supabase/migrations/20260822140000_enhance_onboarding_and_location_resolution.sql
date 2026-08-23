-- ============================================================================
-- STRING PLATFORM - ONBOARDING SETUP & STRUCTURED LOCATION RESOLUTION RPC UPDATE
-- Ensures structured location foreign keys and coordinates are saved directly.
-- ============================================================================

-- Drop prior function signatures to allow updating parameter defaults in PostgreSQL
DROP FUNCTION IF EXISTS public.complete_onboarding_setup(TEXT, TEXT, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.complete_onboarding_setup(TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.complete_onboarding_setup(TEXT, TEXT, TEXT);

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
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_full_name TEXT := NULLIF(btrim(COALESCE(p_full_name, '')), '');
  v_phone TEXT := NULLIF(btrim(COALESCE(p_phone, '')), '');
  v_street_address TEXT;
  v_area_name TEXT;
  v_business_type public.business_type_enum := 'both';

  -- Location IDs & Coordinates
  v_location_area_id UUID;
  v_location_street_id UUID;
  v_location_landmark_id UUID;
  v_latitude DOUBLE PRECISION;
  v_longitude DOUBLE PRECISION;
  v_location_verified BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_full_name IS NULL OR char_length(v_full_name) < 2 THEN
    RAISE EXCEPTION 'Full name must be at least 2 characters';
  END IF;

  IF p_user_type NOT IN ('customer', 'business') THEN
    RAISE EXCEPTION 'Please select a valid account type';
  END IF;

  SELECT COALESCE(
    NULLIF(btrim(auth.jwt() ->> 'email'), ''),
    NULLIF(btrim(email), '')
  )
  INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Unable to resolve the account email for onboarding';
  END IF;

  IF p_user_type = 'business' THEN
    IF p_business_data IS NULL THEN
      RAISE EXCEPTION 'Business onboarding details are missing';
    END IF;

    IF NULLIF(btrim(COALESCE(p_business_data ->> 'companyName', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Company name is required';
    END IF;

    v_street_address := NULLIF(btrim(COALESCE(p_business_data ->> 'streetAddress', '')), '');
    v_area_name := NULLIF(btrim(COALESCE(p_business_data ->> 'areaName', '')), '');

    IF v_street_address IS NULL THEN
      RAISE EXCEPTION 'Street address is required';
    END IF;

    v_business_type := CASE COALESCE(p_business_data ->> 'businessType', 'both')
      WHEN 'goods' THEN 'goods'::public.business_type_enum
      WHEN 'services' THEN 'services'::public.business_type_enum
      ELSE 'both'::public.business_type_enum
    END;

    -- Extract structured location identifiers
    BEGIN
      v_location_area_id := (p_business_data ->> 'locationAreaId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_location_area_id := NULL;
    END;

    BEGIN
      v_location_street_id := (p_business_data ->> 'locationStreetId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_location_street_id := NULL;
    END;

    BEGIN
      v_location_landmark_id := (p_business_data ->> 'locationLandmarkId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_location_landmark_id := NULL;
    END;

    BEGIN
      v_latitude := (p_business_data ->> 'latitude')::DOUBLE PRECISION;
      v_longitude := (p_business_data ->> 'longitude')::DOUBLE PRECISION;
    EXCEPTION WHEN OTHERS THEN
      v_latitude := NULL;
      v_longitude := NULL;
    END;

    IF v_location_area_id IS NOT NULL AND v_latitude IS NOT NULL AND v_longitude IS NOT NULL THEN
      v_location_verified := true;
    END IF;

  ELSE
    IF p_customer_data IS NULL THEN
      RAISE EXCEPTION 'Customer onboarding details are missing';
    END IF;

    v_street_address := NULLIF(btrim(COALESCE(p_customer_data ->> 'streetAddress', '')), '');
    v_area_name := NULLIF(btrim(COALESCE(p_customer_data ->> 'areaName', '')), '');

    BEGIN
      v_location_area_id := (p_customer_data ->> 'locationAreaId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_location_area_id := NULL;
    END;

    BEGIN
      v_location_street_id := (p_customer_data ->> 'locationStreetId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_location_street_id := NULL;
    END;

    BEGIN
      v_location_landmark_id := (p_customer_data ->> 'locationLandmarkId')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_location_landmark_id := NULL;
    END;

    BEGIN
      v_latitude := (p_customer_data ->> 'latitude')::DOUBLE PRECISION;
      v_longitude := (p_customer_data ->> 'longitude')::DOUBLE PRECISION;
    EXCEPTION WHEN OTHERS THEN
      v_latitude := NULL;
      v_longitude := NULL;
    END;

    IF v_location_area_id IS NOT NULL AND v_latitude IS NOT NULL AND v_longitude IS NOT NULL THEN
      v_location_verified := true;
    END IF;
  END IF;

  -- 1. Sync Profile Record
  INSERT INTO public.profiles (
    user_id,
    full_name,
    email,
    phone,
    user_type,
    onboarding_completed
  )
  VALUES (
    v_user_id,
    v_full_name,
    v_email,
    v_phone,
    p_user_type,
    true
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    user_type = EXCLUDED.user_type,
    onboarding_completed = true,
    updated_at = now();

  -- 2. Ensure base user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Insert or Update Business record
  IF p_user_type = 'business' THEN
    INSERT INTO public.businesses (
      user_id,
      company_name,
      industry,
      company_size,
      years_in_operation,
      business_location,
      website,
      business_goals,
      target_customer_type,
      monthly_customer_volume,
      budget_range,
      marketing_channels,
      pain_points,
      products_services,
      competitive_landscape,
      growth_strategy,
      operating_region,
      internal_capacity,
      expectations_from_string,
      strategic_notes,
      street_address,
      area_name,
      business_type,
      location_area_id,
      location_street_id,
      location_landmark_id,
      latitude,
      longitude,
      location_verified
    )
    VALUES (
      v_user_id,
      NULLIF(btrim(COALESCE(p_business_data ->> 'companyName', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'industry', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'companySize', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'yearsInOperation', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'businessLocation', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'website', '')), ''),
      public.jsonb_text_array_or_null(p_business_data -> 'businessGoals'),
      NULLIF(btrim(COALESCE(p_business_data ->> 'targetCustomerType', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'monthlyCustomerVolume', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'budgetRange', '')), ''),
      public.jsonb_text_array_or_null(p_business_data -> 'marketingChannels'),
      public.jsonb_text_array_or_null(p_business_data -> 'painPoints'),
      NULLIF(btrim(COALESCE(p_business_data ->> 'productsServices', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'competitiveLandscape', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'growthStrategy', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'operatingRegion', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'internalCapacity', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'expectationsFromString', '')), ''),
      NULLIF(btrim(COALESCE(p_business_data ->> 'strategicNotes', '')), ''),
      v_street_address,
      v_area_name,
      v_business_type,
      v_location_area_id,
      v_location_street_id,
      v_location_landmark_id,
      v_latitude,
      v_longitude,
      v_location_verified
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      company_name = EXCLUDED.company_name,
      industry = EXCLUDED.industry,
      company_size = EXCLUDED.company_size,
      years_in_operation = EXCLUDED.years_in_operation,
      business_location = EXCLUDED.business_location,
      website = EXCLUDED.website,
      business_goals = EXCLUDED.business_goals,
      target_customer_type = EXCLUDED.target_customer_type,
      monthly_customer_volume = EXCLUDED.monthly_customer_volume,
      budget_range = EXCLUDED.budget_range,
      marketing_channels = EXCLUDED.marketing_channels,
      pain_points = EXCLUDED.pain_points,
      products_services = EXCLUDED.products_services,
      competitive_landscape = EXCLUDED.competitive_landscape,
      growth_strategy = EXCLUDED.growth_strategy,
      operating_region = EXCLUDED.operating_region,
      internal_capacity = EXCLUDED.internal_capacity,
      expectations_from_string = EXCLUDED.expectations_from_string,
      strategic_notes = EXCLUDED.strategic_notes,
      street_address = EXCLUDED.street_address,
      area_name = EXCLUDED.area_name,
      business_type = EXCLUDED.business_type,
      location_area_id = COALESCE(EXCLUDED.location_area_id, businesses.location_area_id),
      location_street_id = COALESCE(EXCLUDED.location_street_id, businesses.location_street_id),
      location_landmark_id = COALESCE(EXCLUDED.location_landmark_id, businesses.location_landmark_id),
      latitude = COALESCE(EXCLUDED.latitude, businesses.latitude),
      longitude = COALESCE(EXCLUDED.longitude, businesses.longitude),
      location_verified = CASE
        WHEN EXCLUDED.location_verified = true THEN true
        WHEN businesses.street_address IS DISTINCT FROM EXCLUDED.street_address
          OR businesses.area_name IS DISTINCT FROM EXCLUDED.area_name
        THEN false
        ELSE COALESCE(businesses.location_verified, false)
      END,
      updated_at = now();

  -- 4. Insert or Update Customer record
  ELSE
    INSERT INTO public.customers (
      user_id,
      age_range,
      gender,
      location,
      interests,
      spending_habits,
      preferred_categories,
      lifestyle_preferences,
      service_expectations,
      pain_points,
      improvement_wishes,
      purchase_frequency,
      custom_preferences,
      street_address,
      area_name,
      location_area_id,
      location_street_id,
      location_landmark_id,
      latitude,
      longitude,
      location_verified
    )
    VALUES (
      v_user_id,
      NULLIF(btrim(COALESCE(p_customer_data ->> 'ageRange', '')), ''),
      NULLIF(btrim(COALESCE(p_customer_data ->> 'gender', '')), ''),
      NULLIF(btrim(COALESCE(p_customer_data ->> 'location', '')), ''),
      public.jsonb_text_array_or_null(p_customer_data -> 'interests'),
      NULLIF(btrim(COALESCE(p_customer_data ->> 'spendingHabits', '')), ''),
      public.jsonb_text_array_or_null(p_customer_data -> 'preferredCategories'),
      public.jsonb_text_array_or_null(p_customer_data -> 'lifestylePreferences'),
      NULLIF(btrim(COALESCE(p_customer_data ->> 'serviceExpectations', '')), ''),
      public.jsonb_text_array_or_null(p_customer_data -> 'painPoints'),
      NULLIF(btrim(COALESCE(p_customer_data ->> 'improvementWishes', '')), ''),
      NULLIF(btrim(COALESCE(p_customer_data ->> 'purchaseFrequency', '')), ''),
      NULLIF(btrim(COALESCE(p_customer_data ->> 'customPreferences', '')), ''),
      v_street_address,
      v_area_name,
      v_location_area_id,
      v_location_street_id,
      v_location_landmark_id,
      v_latitude,
      v_longitude,
      v_location_verified
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      age_range = EXCLUDED.age_range,
      gender = EXCLUDED.gender,
      location = EXCLUDED.location,
      interests = EXCLUDED.interests,
      spending_habits = EXCLUDED.spending_habits,
      preferred_categories = EXCLUDED.preferred_categories,
      lifestyle_preferences = EXCLUDED.lifestyle_preferences,
      service_expectations = EXCLUDED.service_expectations,
      pain_points = EXCLUDED.pain_points,
      improvement_wishes = EXCLUDED.improvement_wishes,
      purchase_frequency = EXCLUDED.purchase_frequency,
      custom_preferences = EXCLUDED.custom_preferences,
      street_address = EXCLUDED.street_address,
      area_name = EXCLUDED.area_name,
      location_area_id = COALESCE(EXCLUDED.location_area_id, customers.location_area_id),
      location_street_id = COALESCE(EXCLUDED.location_street_id, customers.location_street_id),
      location_landmark_id = COALESCE(EXCLUDED.location_landmark_id, customers.location_landmark_id),
      latitude = COALESCE(EXCLUDED.latitude, customers.latitude),
      longitude = COALESCE(EXCLUDED.longitude, customers.longitude),
      location_verified = CASE
        WHEN EXCLUDED.location_verified = true THEN true
        WHEN customers.street_address IS DISTINCT FROM EXCLUDED.street_address
          OR customers.area_name IS DISTINCT FROM EXCLUDED.area_name
        THEN false
        ELSE COALESCE(customers.location_verified, false)
      END,
      updated_at = now();
  END IF;

  DELETE FROM public.onboarding_drafts
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'user_type', p_user_type
  );
END;
$$;
