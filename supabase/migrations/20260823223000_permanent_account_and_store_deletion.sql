-- ==============================================================================
-- MIGRATION: BULLETPROOF PERMANENT ACCOUNT & STORE DELETION (SECURITY DEFINER)
-- Completely purges all user data across all tables and deletes from auth.users
-- ==============================================================================

-- 1. DROP EXISTING RPCs TO PREVENT SIGNATURE/RETURN CONFLICTS
DROP FUNCTION IF EXISTS public.delete_user_account();
DROP FUNCTION IF EXISTS public.delete_business_store();

-- 2. CREATE MASTER PERMANENT ACCOUNT DELETION RPC
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_customer_id UUID;
  v_business_id UUID;
  v_conv RECORD;
  v_notified_count INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to delete account';
  END IF;

  -- 1. Retrieve associated customer & business entity records
  SELECT id INTO v_customer_id FROM public.customers WHERE user_id = v_user_id LIMIT 1;
  SELECT id INTO v_business_id FROM public.businesses WHERE user_id = v_user_id LIMIT 1;

  -- 2. Notify all conversation partners before wiping conversations
  FOR v_conv IN 
    SELECT c.id 
    FROM public.conversations c
    WHERE c.customer_id = v_user_id 
       OR (v_customer_id IS NOT NULL AND c.customer_id = v_customer_id)
       OR c.business_id = v_user_id
       OR (v_business_id IS NOT NULL AND c.business_id = v_business_id)
  LOOP
    BEGIN
      INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, created_at)
      VALUES (
        v_conv.id, 
        v_user_id, 
        CASE WHEN v_business_id IS NOT NULL THEN 'business' ELSE 'customer' END,
        '[SYSTEM]: This account has been permanently deleted by the user. Conversation closed.',
        now()
      );

      UPDATE public.conversations
      SET last_message = '[SYSTEM]: Account Deleted',
          last_message_at = now()
      WHERE id = v_conv.id;
      
      v_notified_count := v_notified_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Continue gracefully if message table constraints fail
      NULL;
    END;
  END LOOP;

  -- 3. Cascade clean up customer-specific data
  IF v_customer_id IS NOT NULL THEN
    DELETE FROM public.cart_items WHERE customer_id = v_customer_id;
    DELETE FROM public.saved_businesses WHERE customer_id = v_customer_id;
    DELETE FROM public.reviews WHERE customer_id = v_customer_id;
    DELETE FROM public.job_requests WHERE customer_id = v_customer_id;
  END IF;

  -- 4. Cascade clean up business-specific data
  IF v_business_id IS NOT NULL THEN
    DELETE FROM public.products WHERE business_id = v_business_id;
    DELETE FROM public.services WHERE business_id = v_business_id;
    DELETE FROM public.business_hours WHERE business_id = v_business_id;
    DELETE FROM public.offers WHERE business_id = v_business_id;
    DELETE FROM public.saved_businesses WHERE business_id = v_business_id;
    DELETE FROM public.reviews WHERE business_id = v_business_id;
    DELETE FROM public.business_views WHERE business_id = v_business_id;
    DELETE FROM public.job_requests WHERE business_id = v_business_id;
    DELETE FROM public.payout_requests WHERE business_id = v_business_id;
    DELETE FROM public.bank_accounts WHERE business_id = v_business_id;
    DELETE FROM public.wallets WHERE business_id = v_business_id;
    DELETE FROM public.businesses WHERE id = v_business_id;
  END IF;

  -- 5. Cascade clean up user-level platform tables
  DELETE FROM public.business_views WHERE viewer_user_id = v_user_id;
  DELETE FROM public.wallet_transactions WHERE user_id = v_user_id;
  DELETE FROM public.wallets WHERE user_id = v_user_id;
  DELETE FROM public.device_tokens WHERE user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.login_history WHERE user_id = v_user_id;
  DELETE FROM public.audit_logs WHERE user_id = v_user_id;
  DELETE FROM public.bank_accounts WHERE user_id = v_user_id;
  DELETE FROM public.customers WHERE user_id = v_user_id;
  DELETE FROM public.businesses WHERE user_id = v_user_id;
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE user_id = v_user_id OR id = v_user_id;

  -- 6. PERMANENTLY PURGE FROM SUPABASE AUTH SCHEMA
  -- This prevents the user from EVER logging in with their old credentials
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'notified_conversations', v_notified_count,
    'deleted_user_id', v_user_id,
    'auth_purged', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO service_role;

-- 3. CREATE DEDICATED STORE-ONLY DELETION RPC
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
  v_notified_count INT := 0;
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
    BEGIN
      INSERT INTO public.messages (conversation_id, sender_id, sender_type, content, created_at)
      VALUES (
        v_conv.id, 
        v_user_id, 
        'business',
        '[SYSTEM]: This merchant store has been permanently closed. Conversation archived.',
        now()
      );

      UPDATE public.conversations
      SET last_message = '[SYSTEM]: Store Closed',
          last_message_at = now()
      WHERE id = v_conv.id;
      
      v_notified_count := v_notified_count + 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  -- 3. Clean up business-specific catalogue & configuration records
  DELETE FROM public.products WHERE business_id = v_business_id;
  DELETE FROM public.services WHERE business_id = v_business_id;
  DELETE FROM public.business_hours WHERE business_id = v_business_id;
  DELETE FROM public.offers WHERE business_id = v_business_id;
  DELETE FROM public.saved_businesses WHERE business_id = v_business_id;
  DELETE FROM public.reviews WHERE business_id = v_business_id;
  DELETE FROM public.business_views WHERE business_id = v_business_id;
  DELETE FROM public.job_requests WHERE business_id = v_business_id;
  DELETE FROM public.payout_requests WHERE business_id = v_business_id;
  DELETE FROM public.bank_accounts WHERE business_id = v_business_id;
  DELETE FROM public.wallets WHERE business_id = v_business_id;
  DELETE FROM public.businesses WHERE id = v_business_id OR user_id = v_user_id;

  -- 4. Revoke business merchant role while preserving admin & customer roles
  DELETE FROM public.user_roles 
  WHERE user_id = v_user_id AND role = 'business';

  -- 5. Revert user profile to customer shopper mode
  UPDATE public.profiles
  SET user_type = 'customer',
      company_name = NULL,
      updated_at = now()
  WHERE user_id = v_user_id OR id = v_user_id;

  -- 6. Ensure customer record exists so user seamlessly remains a shopper
  INSERT INTO public.customers (user_id) 
  VALUES (v_user_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'mode', 'store_only',
    'notified_conversations', v_notified_count,
    'business_id', v_business_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_business_store() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_business_store() TO service_role;
