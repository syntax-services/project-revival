-- ============================================================================
-- DEDICATED STORE-ONLY DELETION RPC
-- Deletes the merchant business & catalogue while keeping Shopper & Admin intact
-- ============================================================================

DROP FUNCTION IF EXISTS public.delete_business_store();

CREATE OR REPLACE FUNCTION public.delete_business_store()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_business_id UUID;
  v_conv RECORD;
  v_count INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to delete store';
  END IF;

  -- 1. Locate the business record for this user
  SELECT id INTO v_business_id 
  FROM public.businesses 
  WHERE user_id = v_user_id 
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active merchant store found for this account'
    );
  END IF;

  -- 2. Notify all conversation partners that this store has been closed
  FOR v_conv IN 
    SELECT c.id 
    FROM public.conversations c
    WHERE c.business_id = v_business_id OR c.business_id = v_user_id
  LOOP
    INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, created_at)
    VALUES (
      v_conv.id, 
      v_user_id, 
      'business',
      '[SYSTEM]: This merchant store has been closed. This conversation is now archived.',
      now()
    );

    UPDATE public.conversations
    SET last_message = '[SYSTEM]: Store Closed',
        last_message_at = now()
    WHERE id = v_conv.id;
    
    v_count := v_count + 1;
  END LOOP;

  -- 3. Clean up business-specific catalogue & configuration records
  DELETE FROM public.products WHERE business_id = v_business_id;
  DELETE FROM public.services WHERE business_id = v_business_id;
  DELETE FROM public.business_hours WHERE business_id = v_business_id;
  DELETE FROM public.offers WHERE business_id = v_business_id;
  DELETE FROM public.saved_businesses WHERE business_id = v_business_id;
  DELETE FROM public.business_wallets WHERE business_id = v_business_id;
  DELETE FROM public.businesses WHERE id = v_business_id;

  -- 4. Revoke business merchant role while preserving admin & customer roles
  DELETE FROM public.user_roles 
  WHERE user_id = v_user_id AND role = 'business';

  -- 5. Ensure customer record exists so user seamlessly remains a shopper
  INSERT INTO public.customers (user_id) 
  VALUES (v_user_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'mode', 'store_only',
    'notified_conversations', v_count,
    'business_id', v_business_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_business_store() TO authenticated;
