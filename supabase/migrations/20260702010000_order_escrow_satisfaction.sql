-- String Platform - Payout Escrow, Customer Satisfaction, Return Dispute, and Wallet Migration

-- 1. Add satisfaction columns to public.orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS satisfaction_status TEXT CHECK (satisfaction_status IN ('pending', 'satisfied', 'unsatisfied')) DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS satisfaction_asked_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS satisfaction_responded_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_status TEXT CHECK (return_status IN ('none', 'requested', 'returned')) DEFAULT 'none';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_confirmed_by_shopper BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_confirmed_by_business BOOLEAN DEFAULT false;

-- 2. Define or replace atomic functions for settling orders using pending_escrow
CREATE OR REPLACE FUNCTION public.settle_order_settlement(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_wallet RECORD;
    v_net_payout NUMERIC;
    v_total_deductions NUMERIC;
BEGIN
    -- 1. Get order details and lock the row
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE id = p_order_id AND status IN ('confirmed', 'processing', 'shipped', 'delivered')
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found or already settled');
    END IF;

    -- 2. Calculate net payout
    v_total_deductions := COALESCE(v_order.commission_amount, 0) + COALESCE(v_order.platform_fee, 0);
    v_net_payout := v_order.total - v_total_deductions;

    IF v_net_payout < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid net payout calculation');
    END IF;

    -- 3. Update order status
    UPDATE public.orders 
    SET status = 'delivered', 
        satisfaction_status = 'satisfied',
        delivered_at = COALESCE(delivered_at, NOW()),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 4. Update business wallet atomically, deducting from pending_escrow
    SELECT * INTO v_wallet 
    FROM public.business_wallets 
    WHERE business_id = v_order.business_id
    FOR UPDATE;

    IF v_wallet IS NULL THEN
        INSERT INTO public.business_wallets (business_id, pending_escrow, available_balance, updated_at)
        VALUES (v_order.business_id, 0, v_net_payout, NOW());
    ELSE
        UPDATE public.business_wallets
        SET pending_escrow = GREATEST(0, pending_escrow - v_net_payout),
            available_balance = available_balance + v_net_payout,
            updated_at = NOW()
        WHERE business_id = v_order.business_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'net_payout', v_net_payout);
END;
$$;

-- 3. Define or replace atomic functions for settling jobs using pending_escrow
CREATE OR REPLACE FUNCTION public.settle_job_settlement(p_job_id UUID, p_final_price NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job RECORD;
    v_wallet RECORD;
    v_net_payout NUMERIC;
    v_commission NUMERIC;
BEGIN
    -- 1. Get job details and lock the row
    SELECT * INTO v_job 
    FROM public.jobs 
    WHERE id = p_job_id AND (status = 'accepted' OR status = 'ongoing')
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job not found or ineligible for settlement');
    END IF;

    -- 2. Calculate net payout
    v_commission := ROUND(p_final_price * 0.1);
    v_net_payout := p_final_price - v_commission;

    IF v_net_payout < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid net payout calculation');
    END IF;

    -- 3. Update job status
    UPDATE public.jobs 
    SET status = 'completed', 
        final_price = p_final_price,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_job_id;

    -- 4. Update business wallet atomically, deducting from pending_escrow
    SELECT * INTO v_wallet 
    FROM public.business_wallets 
    WHERE business_id = v_job.business_id
    FOR UPDATE;

    IF v_wallet IS NULL THEN
        INSERT INTO public.business_wallets (business_id, pending_escrow, available_balance, updated_at)
        VALUES (v_job.business_id, 0, v_net_payout, NOW());
    ELSE
        DECLARE
            v_initial_pending_payout NUMERIC;
        BEGIN
            v_initial_pending_payout := ROUND(COALESCE(v_job.quoted_price, 0) * 0.9);
            
            UPDATE public.business_wallets
            SET pending_escrow = GREATEST(0, pending_escrow - v_initial_pending_payout),
                available_balance = available_balance + v_net_payout,
                updated_at = NOW()
            WHERE business_id = v_job.business_id;
        END;
    END IF;

    RETURN jsonb_build_object('success', true, 'net_payout', v_net_payout);
END;
$$;

-- 4. Define or replace withdrawal settlement processor
DROP FUNCTION IF EXISTS public.process_withdrawal_settlement(UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.process_withdrawal_settlement(
  p_withdrawal_id UUID,
  p_admin_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req RECORD;
  v_caller_role TEXT;
BEGIN
  -- Verify that the caller is actually an admin
  SELECT role INTO v_caller_role FROM public.user_roles WHERE user_id = p_admin_id AND role = 'admin';
  IF NOT FOUND THEN
    -- Check in profiles as fallback
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_admin_id AND user_type = 'admin') THEN
      RAISE EXCEPTION 'Unauthorized: only admins can process withdrawals';
    END IF;
  END IF;

  -- Lock the withdrawal request
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal request not found');
  END IF;

  IF v_req.status = 'completed' OR v_req.status = 'rejected' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal has already been processed');
  END IF;

  -- If status is rejected, perform the refund
  IF p_status = 'rejected' THEN
    IF v_req.withdrawal_type = 'coupon' THEN
      UPDATE public.profiles
      SET coupon_balance = coupon_balance + v_req.amount,
          updated_at = now()
      WHERE user_id = v_req.user_id;
    ELSIF v_req.withdrawal_type = 'runner' THEN
      UPDATE public.profiles
      SET runner_balance = runner_balance + v_req.amount,
          updated_at = now()
      WHERE user_id = v_req.user_id;
    ELSIF v_req.withdrawal_type = 'business' THEN
      UPDATE public.business_wallets
      SET available_balance = available_balance + v_req.amount,
          updated_at = now()
      WHERE business_id = v_req.business_id;
    END IF;
  END IF;

  -- Update withdrawal request status
  UPDATE public.withdrawal_requests
  SET status = p_status,
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      processed_at = now(),
      processed_by = p_admin_id,
      updated_at = now()
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Define or replace satisfaction responder
CREATE OR REPLACE FUNCTION public.respond_to_satisfaction(
  p_order_id UUID,
  p_satisfied BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_wallet RECORD;
  v_net_payout NUMERIC;
  v_deductions NUMERIC;
BEGIN
  -- Fetch order and lock
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.satisfaction_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Satisfaction has already been responded to');
  END IF;

  IF p_satisfied THEN
    -- Settle the order
    v_deductions := COALESCE(v_order.commission_amount, 0) + COALESCE(v_order.platform_fee, 0);
    v_net_payout := v_order.total - v_deductions;

    -- Update order status and satisfaction status
    UPDATE public.orders
    SET satisfaction_status = 'satisfied',
        satisfaction_responded_at = now(),
        status = 'delivered',
        delivered_at = COALESCE(delivered_at, now()),
        updated_at = now()
    WHERE id = p_order_id;

    -- Move from pending_escrow to available_balance
    SELECT * INTO v_wallet FROM public.business_wallets WHERE business_id = v_order.business_id FOR UPDATE;
    IF v_wallet IS NOT NULL THEN
      UPDATE public.business_wallets
      SET pending_escrow = GREATEST(0, pending_escrow - v_net_payout),
          available_balance = available_balance + v_net_payout,
          updated_at = now()
      WHERE business_id = v_order.business_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'status', 'satisfied');
  ELSE
    -- Reject satisfaction, start return requested flow
    UPDATE public.orders
    SET satisfaction_status = 'unsatisfied',
        satisfaction_responded_at = now(),
        return_status = 'requested',
        updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'status', 'unsatisfied');
  END IF;
END;
$$;

-- 6. Define or replace return confirmation function
CREATE OR REPLACE FUNCTION public.confirm_order_return(
  p_order_id UUID,
  p_actor_type TEXT -- 'shopper' or 'business'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_profile RECORD;
  v_wallet RECORD;
  v_net_payout NUMERIC;
  v_deductions NUMERIC;
BEGIN
  -- Fetch order and lock
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.satisfaction_status != 'unsatisfied' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not in unsatisfied status');
  END IF;

  IF p_actor_type = 'shopper' THEN
    IF auth.uid() != (SELECT user_id FROM public.customers WHERE id = v_order.customer_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    UPDATE public.orders
    SET return_confirmed_by_shopper = true,
        updated_at = now()
    WHERE id = p_order_id;
  ELSIF p_actor_type = 'business' THEN
    IF auth.uid() != (SELECT user_id FROM public.businesses WHERE id = v_order.business_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    UPDATE public.orders
    SET return_confirmed_by_business = true,
        updated_at = now()
    WHERE id = p_order_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid actor type');
  END IF;

  -- Re-fetch to check if both are true
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;

  IF v_order.return_confirmed_by_shopper AND v_order.return_confirmed_by_business THEN
    -- Both confirmed, process refund
    v_deductions := COALESCE(v_order.commission_amount, 0) + COALESCE(v_order.platform_fee, 0);
    v_net_payout := v_order.total - v_deductions;

    -- Update order status
    UPDATE public.orders
    SET status = 'refunded',
        return_status = 'returned',
        updated_at = now()
    WHERE id = p_order_id;

    -- Refund shopper wallet (they paid v_order.total)
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + v_order.total,
        updated_at = now()
    WHERE user_id = (SELECT user_id FROM public.customers WHERE id = v_order.customer_id);

    -- Deduct from business pending_escrow
    SELECT * INTO v_wallet FROM public.business_wallets WHERE business_id = v_order.business_id FOR UPDATE;
    IF v_wallet IS NOT NULL THEN
      UPDATE public.business_wallets
      SET pending_escrow = GREATEST(0, pending_escrow - v_net_payout),
          updated_at = now()
      WHERE business_id = v_order.business_id;
    END IF;

    -- Create notification for shopper
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (
      (SELECT user_id FROM public.customers WHERE id = v_order.customer_id),
      'Refund Processed 💰',
      'Your refund of ₦' || v_order.total || ' has been credited back to your wallet.',
      'order',
      jsonb_build_object('order_id', v_order.id)
    );

    RETURN jsonb_build_object('success', true, 'refunded', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'refunded', false);
END;
$$;

-- 7. Define or replace auto-settler for unconfirmed orders
CREATE OR REPLACE FUNCTION public.auto_settle_unconfirmed_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_wallet RECORD;
  v_net_payout NUMERIC;
  v_deductions NUMERIC;
  v_count INTEGER := 0;
BEGIN
  -- Select all delivered or shipped orders that are pending satisfaction check for more than 3 hours
  FOR v_order IN 
    SELECT * 
    FROM public.orders 
    WHERE (status = 'delivered' OR status = 'shipped')
      AND satisfaction_status = 'pending'
      AND satisfaction_asked_at < (now() - INTERVAL '3 hours')
  LOOP
    -- Lock order row
    SELECT * FROM public.orders WHERE id = v_order.id FOR UPDATE;
    
    v_deductions := COALESCE(v_order.commission_amount, 0) + COALESCE(v_order.platform_fee, 0);
    v_net_payout := v_order.total - v_deductions;

    -- Settle order
    UPDATE public.orders
    SET satisfaction_status = 'satisfied',
        status = 'delivered',
        delivered_at = COALESCE(delivered_at, now()),
        updated_at = now()
    WHERE id = v_order.id;

    -- Move from pending_escrow to available_balance
    SELECT * INTO v_wallet FROM public.business_wallets WHERE business_id = v_order.business_id FOR UPDATE;
    IF v_wallet IS NOT NULL THEN
      UPDATE public.business_wallets
      SET pending_escrow = GREATEST(0, pending_escrow - v_net_payout),
          available_balance = available_balance + v_net_payout,
          updated_at = now()
      WHERE business_id = v_order.business_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'settled_count', v_count);
END;
$$;

-- Grant execute permissions to public functions
REVOKE ALL ON FUNCTION public.process_withdrawal_settlement(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_withdrawal_settlement(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_withdrawal_settlement(UUID, UUID, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.respond_to_satisfaction(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_satisfaction(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_satisfaction(UUID, BOOLEAN) TO service_role;

REVOKE ALL ON FUNCTION public.confirm_order_return(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_order_return(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_return(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.auto_settle_unconfirmed_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_settle_unconfirmed_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_settle_unconfirmed_orders() TO service_role;
