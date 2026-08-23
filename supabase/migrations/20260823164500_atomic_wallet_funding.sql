-- ==============================================================================
-- ATOMIC WALLET FUNDING RPC
-- ==============================================================================
-- Prevents race conditions during webhook fulfillment by incrementing
-- directly inside Postgres rather than reading + writing from TypeScript.

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount,
      total_funded = COALESCE(total_funded, 0) + p_amount
  WHERE user_id = p_user_id
  RETURNING wallet_balance INTO v_new_balance;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

COMMIT;
