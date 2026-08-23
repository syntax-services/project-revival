-- ============================================================================
-- SECURE USER ACCOUNT DELETION RPC
-- ============================================================================

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

  -- 1. Inactivate & anonymize businesses owned by user
  UPDATE public.businesses
  SET is_active = false,
      company_name = 'Deleted Account',
      description = NULL,
      website = NULL
  WHERE user_id = v_user_id;

  -- 2. Clean up customer records
  DELETE FROM public.customers WHERE user_id = v_user_id;

  -- 3. Delete user notifications & feedbacks
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.user_feedbacks WHERE user_id = v_user_id;

  -- 4. Delete user profile
  DELETE FROM public.profiles WHERE user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
