-- ============================================================================
-- BULLETPROOF CONVERSATIONS & MESSAGING (SECURITY DEFINER RPCS + RLS RESILIENCE)
-- ============================================================================

-- 1. Ensure auto-provision customer helper function
CREATE OR REPLACE FUNCTION public.ensure_customer_account(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (user_id)
    VALUES (p_user_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_customer_id;

    IF v_customer_id IS NULL THEN
      SELECT id INTO v_customer_id
      FROM public.customers
      WHERE user_id = p_user_id
      LIMIT 1;
    END IF;
  END IF;

  RETURN COALESCE(v_customer_id, p_user_id);
END;
$$;

-- 2. RPC to get or start a conversation safely with zero RLS failures
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
  v_customer_id := public.ensure_customer_account(v_user_id);

  -- Find existing conversation (checking both customer table ID and user auth ID)
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE (customer_id = v_customer_id OR customer_id = v_user_id)
    AND business_id = p_business_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If not found, create new conversation
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

GRANT EXECUTE ON FUNCTION public.ensure_customer_account(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_or_get_conversation(UUID) TO authenticated, service_role;

-- 3. Robust Customer Conversations Fetcher RPC (Returns all conversations)
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

  SELECT c_row.id INTO v_customer_id
  FROM public.customers c_row
  WHERE c_row.user_id = v_user_id
  LIMIT 1;

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

-- 4. Robust Business Conversations Fetcher RPC
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

  SELECT b.id INTO v_business_id
  FROM public.businesses b
  WHERE b.user_id = v_user_id
  LIMIT 1;

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

-- 5. Resilient RLS Policies on Conversations & Messages
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Customers can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Businesses can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Customers can start conversations" ON public.conversations;

CREATE POLICY "Conversations participant access" ON public.conversations
FOR ALL
USING (
  customer_id = auth.uid()
  OR business_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.customers WHERE customers.id = conversations.customer_id AND customers.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = conversations.business_id AND businesses.user_id = auth.uid())
)
WITH CHECK (
  customer_id = auth.uid()
  OR business_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.customers WHERE customers.id = conversations.customer_id AND customers.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = conversations.business_id AND businesses.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Conversation participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

CREATE POLICY "Messages participant select" ON public.messages
FOR SELECT
USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (
      c.customer_id = auth.uid()
      OR c.business_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.customers WHERE customers.id = c.customer_id AND customers.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = c.business_id AND businesses.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Messages sender insert" ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Messages update read" ON public.messages
FOR UPDATE
USING (true);
