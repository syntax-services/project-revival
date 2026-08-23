-- ============================================================================
-- MIGRATION: 20260823120000_fix_conversation_avatars_and_profiles.sql
-- PURPOSE: Fix profile avatars, business logos, and robust RPC conversation hydration
-- ============================================================================

-- 1. Ensure RLS policies allow reading avatars and names for chat participants
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Allow public/authenticated read of profiles for chat'
  ) THEN
    CREATE POLICY "Allow public/authenticated read of profiles for chat"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Allow authenticated read of customers for chat'
  ) THEN
    CREATE POLICY "Allow authenticated read of customers for chat"
      ON public.customers FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'businesses' AND policyname = 'Allow authenticated read of businesses for chat'
  ) THEN
    CREATE POLICY "Allow authenticated read of businesses for chat"
      ON public.businesses FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 2. Drop old functions to avoid return type signature conflicts
DROP FUNCTION IF EXISTS public.get_business_conversations(UUID);
DROP FUNCTION IF EXISTS public.get_customer_conversations(UUID);
DROP FUNCTION IF EXISTS public.get_my_customer_conversations();

-- 3. Robust get_business_conversations including customer avatar_url
CREATE OR REPLACE FUNCTION public.get_business_conversations(p_business_id UUID)
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  customer_name TEXT,
  avatar_url TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  verification_level INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.customer_id,
    COALESCE(p.full_name, 'Shopper') AS customer_name,
    COALESCE(p.avatar_url, '') AS avatar_url,
    lm.content AS last_message,
    COALESCE(lm.created_at, c.last_message_at, c.created_at) AS last_message_at,
    COUNT(um.id) AS unread_count,
    COALESCE(p.verification_level, 0) AS verification_level
  FROM public.conversations c
  JOIN public.businesses b ON b.id = c.business_id
  LEFT JOIN public.customers cu ON (cu.id = c.customer_id OR cu.user_id = c.customer_id)
  LEFT JOIN public.profiles p ON (p.user_id = cu.user_id OR p.id = c.customer_id OR p.user_id = c.customer_id)
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
  WHERE c.business_id = p_business_id
    AND b.user_id = auth.uid()
  GROUP BY c.id, c.customer_id, p.full_name, p.avatar_url, lm.content, lm.created_at, c.last_message_at, c.created_at, p.verification_level
  ORDER BY COALESCE(lm.created_at, c.last_message_at, c.created_at) DESC;
$$;

-- 4. Robust get_customer_conversations including business logo_url
CREATE OR REPLACE FUNCTION public.get_customer_conversations(p_customer_id UUID)
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.business_id,
    COALESCE(b.company_name, 'Merchant Shop') AS business_name,
    COALESCE(b.logo_url, b.cover_image_url, bp.avatar_url, '') AS logo_url,
    lm.content AS last_message,
    COALESCE(lm.created_at, c.last_message_at, c.created_at) AS last_message_at,
    COUNT(um.id) AS unread_count,
    COALESCE(b.location_verified, false) AS verified
  FROM public.conversations c
  JOIN public.businesses b ON b.id = c.business_id
  LEFT JOIN public.profiles bp ON bp.user_id = b.user_id
  LEFT JOIN public.customers cu ON cu.id = c.customer_id
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
  WHERE (c.customer_id = p_customer_id OR c.customer_id = auth.uid() OR cu.user_id = auth.uid())
  GROUP BY c.id, c.business_id, b.company_name, b.logo_url, b.cover_image_url, bp.avatar_url, lm.content, lm.created_at, c.last_message_at, c.created_at, b.location_verified
  ORDER BY COALESCE(lm.created_at, c.last_message_at, c.created_at) DESC;
$$;

-- 5. get_my_customer_conversations (Context-aware for auth.uid())
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.business_id,
    COALESCE(b.company_name, 'Merchant Shop') AS business_name,
    COALESCE(b.logo_url, b.cover_image_url, bp.avatar_url, '') AS logo_url,
    lm.content AS last_message,
    COALESCE(lm.created_at, c.last_message_at, c.created_at) AS last_message_at,
    COUNT(um.id) AS unread_count,
    COALESCE(b.location_verified, false) AS verified
  FROM public.conversations c
  JOIN public.businesses b ON b.id = c.business_id
  LEFT JOIN public.profiles bp ON bp.user_id = b.user_id
  LEFT JOIN public.customers cu ON cu.id = c.customer_id
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
  WHERE (c.customer_id = auth.uid() OR cu.user_id = auth.uid())
  GROUP BY c.id, c.business_id, b.company_name, b.logo_url, b.cover_image_url, bp.avatar_url, lm.content, lm.created_at, c.last_message_at, c.created_at, b.location_verified
  ORDER BY COALESCE(lm.created_at, c.last_message_at, c.created_at) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_conversations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_conversations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_customer_conversations() TO authenticated;
