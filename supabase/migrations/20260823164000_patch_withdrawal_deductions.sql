-- ==============================================================================
-- CRITICAL SECURITY PATCH: WITHDRAWAL REQUEST DEDUCTIONS
-- ==============================================================================
-- Prevents infinite money glitch by atomically deducting the requested withdrawal
-- amount from the respective wallet (business, coupon, or runner) BEFORE the 
-- withdrawal request is successfully inserted into the database.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.deduct_balance_on_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available NUMERIC;
BEGIN
  -- 1. Determine which wallet to deduct from based on the withdrawal_type
  IF NEW.withdrawal_type = 'coupon' THEN
    -- Lock and check customer profile coupon balance
    SELECT coupon_balance INTO v_available 
    FROM public.profiles 
    WHERE user_id = NEW.user_id 
    FOR UPDATE;

    IF v_available < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient coupon balance. Available: %, Requested: %', v_available, NEW.amount;
    END IF;

    -- Deduct
    UPDATE public.profiles 
    SET coupon_balance = coupon_balance - NEW.amount 
    WHERE user_id = NEW.user_id;

  ELSIF NEW.withdrawal_type = 'runner' THEN
    -- Lock and check customer profile runner balance
    SELECT runner_balance INTO v_available 
    FROM public.profiles 
    WHERE user_id = NEW.user_id 
    FOR UPDATE;

    IF v_available < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient runner balance. Available: %, Requested: %', v_available, NEW.amount;
    END IF;

    -- Deduct
    UPDATE public.profiles 
    SET runner_balance = runner_balance - NEW.amount 
    WHERE user_id = NEW.user_id;

  ELSIF NEW.withdrawal_type = 'business' OR NEW.withdrawal_type IS NULL THEN
    -- Fallback to business if not specified (legacy rows might lack it)
    NEW.withdrawal_type := 'business';
    
    -- Lock and check business wallet balance
    SELECT available_balance INTO v_available 
    FROM public.business_wallets 
    WHERE business_id = NEW.business_id 
    FOR UPDATE;

    IF v_available < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient business available balance. Available: %, Requested: %', v_available, NEW.amount;
    END IF;

    -- Deduct
    UPDATE public.business_wallets 
    SET available_balance = available_balance - NEW.amount 
    WHERE business_id = NEW.business_id;
    
  ELSE
    RAISE EXCEPTION 'Invalid withdrawal_type specified: %', NEW.withdrawal_type;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the trigger if it already exists to avoid conflicts
DROP TRIGGER IF EXISTS trg_deduct_balance_on_withdrawal ON public.withdrawal_requests;

-- Create the BEFORE INSERT trigger
CREATE TRIGGER trg_deduct_balance_on_withdrawal
BEFORE INSERT ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.deduct_balance_on_withdrawal();

COMMIT;
