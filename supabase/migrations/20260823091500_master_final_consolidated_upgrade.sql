-- ============================================================================
-- MASTER FINAL UPGRADE: DROP & RECREATE DELETE_USER_ACCOUNT + MESSAGING RPCS
-- ============================================================================

-- 1. DROP EXISTING FUNCTION FIRST TO PREVENT RETURN TYPE CONFLICTS (42P13)
DROP FUNCTION IF EXISTS public.delete_user_account();

-- 2. RECREATE BULLETPROOF ACCOUNT DELETION WITH CHAT NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_customer_id UUID;
  v_business_id UUID;
  v_conv RECORD;
  v_count INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to delete account';
  END IF;

  -- 1. Identify associated customer & business entity records
  SELECT id INTO v_customer_id FROM public.customers WHERE user_id = v_user_id LIMIT 1;
  SELECT id INTO v_business_id FROM public.businesses WHERE user_id = v_user_id LIMIT 1;

  -- 2. Notify all conversation partners via automated system message
  FOR v_conv IN 
    SELECT c.id 
    FROM public.conversations c
    WHERE c.customer_id = v_user_id 
       OR (v_customer_id IS NOT NULL AND c.customer_id = v_customer_id)
       OR c.business_id = v_user_id
       OR (v_business_id IS NOT NULL AND c.business_id = v_business_id)
  LOOP
    -- Insert system notification
    INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, created_at)
    VALUES (
      v_conv.id, 
      v_user_id, 
      CASE WHEN v_business_id IS NOT NULL THEN 'business' ELSE 'customer' END,
      '[SYSTEM]: This account has been deleted by the user. This conversation is now archived.',
      now()
    );

    -- Update last message on conversation
    UPDATE public.conversations
    SET last_message = '[SYSTEM]: Account Deleted',
        last_message_at = now()
    WHERE id = v_conv.id;
    
    v_count := v_count + 1;
  END LOOP;

  -- 3. Clean up customer specific records
  IF v_customer_id IS NOT NULL THEN
    DELETE FROM public.saved_businesses WHERE customer_id = v_customer_id;
    DELETE FROM public.reviews WHERE customer_id = v_customer_id;
  END IF;

  -- 4. Clean up business specific records
  IF v_business_id IS NOT NULL THEN
    DELETE FROM public.products WHERE business_id = v_business_id;
    DELETE FROM public.services WHERE business_id = v_business_id;
    DELETE FROM public.business_hours WHERE business_id = v_business_id;
    DELETE FROM public.offers WHERE business_id = v_business_id;
    DELETE FROM public.saved_businesses WHERE business_id = v_business_id;
    DELETE FROM public.businesses WHERE id = v_business_id;
  END IF;

  -- 5. Clean up base profiles and customer records
  DELETE FROM public.customers WHERE user_id = v_user_id;
  DELETE FROM public.businesses WHERE user_id = v_user_id;
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE user_id = v_user_id OR id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'notified_conversations', v_count,
    'deleted_user_id', v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- 3. CONVERSATIONS RPCS
DROP FUNCTION IF EXISTS public.start_or_get_conversation(UUID);
CREATE OR REPLACE FUNCTION public.start_or_get_conversation(p_business_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  business_id UUID,
  business_name TEXT,
  logo_url TEXT,
  verified BOOLEAN,
  last_message TEXT,
  last_message_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_customer_id UUID;
  v_conv_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure customer row exists
  SELECT id INTO v_customer_id FROM public.customers WHERE user_id = v_user_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (user_id) VALUES (v_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_customer_id;
    IF v_customer_id IS NULL THEN
      SELECT id INTO v_customer_id FROM public.customers WHERE user_id = v_user_id LIMIT 1;
    END IF;
  END IF;
  v_customer_id := COALESCE(v_customer_id, v_user_id);

  -- Find existing conversation
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE (customer_id = v_customer_id OR customer_id = v_user_id)
    AND business_id = p_business_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create if not found
  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (customer_id, business_id, last_message_at)
    VALUES (v_customer_id, p_business_id, now())
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN QUERY
  SELECT 
    c.id AS conversation_id,
    c.business_id,
    COALESCE(b.company_name, 'Merchant Shop') AS business_name,
    COALESCE(b.logo_url, b.cover_image_url) AS logo_url,
    COALESCE(b.location_verified, b.verified, false) AS verified,
    c.last_message,
    c.last_message_at
  FROM public.conversations c
  LEFT JOIN public.businesses b ON b.id = c.business_id
  WHERE c.id = v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_or_get_conversation(UUID) TO authenticated, service_role;

-- 4. CUSTOMER CONVERSATIONS FETCHER RPC
DROP FUNCTION IF EXISTS public.get_my_customer_conversations();
CREATE OR REPLACE FUNCTION public.get_my_customer_conversations()
RETURNS TABLE (
  id UUID,
  business_id UUID,
  business_name TEXT,
  logo_url TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_customer_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT c_row.id INTO v_customer_id FROM public.customers c_row WHERE c_row.user_id = v_user_id LIMIT 1;

  RETURN QUERY
  SELECT
    c.id,
    c.business_id,
    COALESCE(b.company_name, 'Merchant Shop') AS business_name,
    COALESCE(b.logo_url, b.cover_image_url) AS logo_url,
    lm.content AS last_message,
    COALESCE(lm.created_at, c.last_message_at, c.created_at) AS last_message_at,
    COUNT(um.id) AS unread_count,
    COALESCE(b.location_verified, b.verified, false) AS verified
  FROM public.conversations c
  LEFT JOIN public.businesses b ON b.id = c.business_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN public.messages um
    ON um.conversation_id = c.id
   AND um.sender_type = 'business'
   AND um.read_at IS NULL
  WHERE c.customer_id = v_user_id 
     OR (v_customer_id IS NOT NULL AND c.customer_id = v_customer_id)
  GROUP BY c.id, c.business_id, b.company_name, b.logo_url, b.cover_image_url, lm.content, lm.created_at, c.last_message_at, c.created_at, b.location_verified, b.verified
  ORDER BY COALESCE(lm.created_at, c.last_message_at, c.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_customer_conversations() TO authenticated, service_role;

-- 5. BUSINESS CONVERSATIONS FETCHER RPC
DROP FUNCTION IF EXISTS public.get_my_business_conversations();
CREATE OR REPLACE FUNCTION public.get_my_business_conversations()
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  customer_name TEXT,
  avatar_url TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  verification_level INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_business_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT b.id INTO v_business_id FROM public.businesses b WHERE b.user_id = v_user_id LIMIT 1;

  RETURN QUERY
  SELECT
    c.id,
    c.customer_id,
    COALESCE(p.full_name, 'Campus Shopper') AS customer_name,
    p.avatar_url,
    lm.content AS last_message,
    COALESCE(lm.created_at, c.last_message_at, c.created_at) AS last_message_at,
    COUNT(um.id) AS unread_count,
    COALESCE(p.verification_level, 0) AS verification_level
  FROM public.conversations c
  LEFT JOIN public.customers cu ON cu.id = c.customer_id
  LEFT JOIN public.profiles p ON (p.user_id = cu.user_id OR p.user_id = c.customer_id OR p.id = c.customer_id)
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN public.messages um
    ON um.conversation_id = c.id
   AND um.sender_type = 'customer'
   AND um.read_at IS NULL
  WHERE (v_business_id IS NOT NULL AND c.business_id = v_business_id)
     OR c.business_id = v_user_id
  GROUP BY c.id, c.customer_id, p.full_name, p.avatar_url, lm.content, lm.created_at, c.last_message_at, c.created_at, p.verification_level
  ORDER BY COALESCE(lm.created_at, c.last_message_at, c.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_business_conversations() TO authenticated, service_role;
