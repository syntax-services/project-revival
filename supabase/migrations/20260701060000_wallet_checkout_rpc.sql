-- Migration: Wallet Checkout RPC
-- Description: Adds database transaction function for instant wallet payment settlement.

CREATE OR REPLACE FUNCTION public.pay_with_wallet(
  p_order_ids UUID[] DEFAULT NULL,
  p_job_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile RECORD;
  v_total_amount NUMERIC := 0.00;
  v_order RECORD;
  v_job RECORD;
  v_order_id UUID;
  v_net_payout NUMERIC;
  v_commission NUMERIC;
  v_deductions NUMERIC;
  v_business RECORD;
  v_tx_ref TEXT;
BEGIN
  -- 1. Verify user authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- 2. Fetch and lock profile
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- 3. Check compliance and gating
  IF COALESCE(v_profile.verification_level, 1) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'NIN/BVN identity verification (Level 2) is required to activate and pay from your String Wallet.');
  END IF;

  IF COALESCE(v_profile.aml_flagged, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your wallet is temporarily suspended for compliance review.');
  END IF;

  -- 4. Calculate total amount
  IF p_job_id IS NOT NULL THEN
    -- Pay for a Job
    SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id AND status = 'quoted' FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Job not found or not in quoted status');
    END IF;
    v_total_amount := v_job.quoted_price;
  ELSIF p_order_ids IS NOT NULL AND array_length(p_order_ids, 1) > 0 THEN
    -- Pay for Orders
    FOR v_order_id IN SELECT unnest(p_order_ids) LOOP
      SELECT total INTO v_order FROM public.orders WHERE id = v_order_id AND status = 'pending' FOR UPDATE;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order ' || v_order_id || ' not found or not pending');
      END IF;
      v_total_amount := v_total_amount + v_order.total;
    END LOOP;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'No order IDs or job ID provided');
  END IF;

  -- 5. Check wallet balance
  IF COALESCE(v_profile.wallet_balance, 0.00) < v_total_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance. Total required: ₦' || v_total_amount || ', available: ₦' || v_profile.wallet_balance);
  END IF;

  -- 6. Deduct from wallet
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - v_total_amount,
      total_spent = total_spent + v_total_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- 7. Settle financial ledgers
  v_tx_ref := 'wallet_tx_' || substring(md5(random()::text) from 1 for 10) || extract(epoch from now())::bigint;

  IF p_job_id IS NOT NULL THEN
    -- Update Job status
    UPDATE public.jobs
    SET status = 'accepted',
        accepted_at = now(),
        updated_at = now()
    WHERE id = p_job_id;

    -- Job settlement math: 6% platform fee
    v_commission := round(v_job.quoted_price * 0.06);
    v_net_payout := v_job.quoted_price - v_commission;

    -- Update Business Wallet Escrow
    -- Service Category B: 60% immediate available_balance, 40% pending_escrow
    -- BUT if the business is on probation, lock 100% in pending_escrow!
    IF public.is_vendor_on_probation(v_job.business_id) THEN
      INSERT INTO public.business_wallets (business_id, pending_escrow, updated_at)
      VALUES (v_job.business_id, v_net_payout, now())
      ON CONFLICT (business_id) DO UPDATE
      SET pending_escrow = business_wallets.pending_escrow + EXCLUDED.pending_escrow,
          updated_at = now();
    ELSE
      INSERT INTO public.business_wallets (business_id, available_balance, pending_escrow, updated_at)
      VALUES (v_job.business_id, round(v_net_payout * 0.60), round(v_net_payout * 0.40), now())
      ON CONFLICT (business_id) DO UPDATE
      SET available_balance = business_wallets.available_balance + EXCLUDED.available_balance,
          pending_escrow = business_wallets.pending_escrow + EXCLUDED.pending_escrow,
          updated_at = now();
    END IF;

    -- Create notifications
    SELECT user_id, company_name INTO v_business FROM public.businesses WHERE id = v_job.business_id;
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (
      v_business.user_id,
      'Quote Paid! 🛠️',
      'Customer paid the ₦' || v_job.quoted_price || ' quote for job #' || substring(v_job.id::text from 1 for 8) || '. You can now start work.',
      'job',
      jsonb_build_object('job_id', v_job.id)
    );

    -- Create transaction record
    INSERT INTO public.payment_transactions (
      user_id, order_id, amount, status, paystack_reference, payment_method, paid_at, metadata
    ) VALUES (
      v_user_id, NULL, v_job.quoted_price, 'success', v_tx_ref, 'wallet', now(),
      jsonb_build_object('job_id', p_job_id, 'payment_channel', 'wallet')
    );

  ELSE
    -- Process all orders
    FOR v_order_id IN SELECT unnest(p_order_ids) LOOP
      SELECT * INTO v_order FROM public.orders WHERE id = v_order_id;
      
      -- Update Order
      UPDATE public.orders
      SET status = 'confirmed',
          confirmed_at = now(),
          updated_at = now()
      WHERE id = v_order_id;

      -- Calculate commission (6% bearer main merchant)
      v_deductions := COALESCE(v_order.commission_amount, 0) + COALESCE(v_order.platform_fee, 0);
      v_net_payout := v_order.total - v_deductions;

      -- Update Business Wallet Escrow
      -- Order Category A: Lock 100% in pending_escrow
      INSERT INTO public.business_wallets (business_id, pending_escrow, updated_at)
      VALUES (v_order.business_id, v_net_payout, now())
      ON CONFLICT (business_id) DO UPDATE
      SET pending_escrow = business_wallets.pending_escrow + EXCLUDED.pending_escrow,
          updated_at = now();

      -- Notifications
      SELECT user_id, company_name INTO v_business FROM public.businesses WHERE id = v_order.business_id;
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        v_business.user_id,
        'New Paid Order',
        'You have a new paid order #' || substring(v_order_id::text from 1 for 8) || '. Check your dashboard to start processing.',
        'order',
        jsonb_build_object('order_id', v_order_id)
      );

      -- Transaction record
      INSERT INTO public.payment_transactions (
        user_id, order_id, amount, status, paystack_reference, payment_method, paid_at, metadata
      ) VALUES (
        v_user_id, v_order_id, v_order.total, 'success', v_tx_ref || '_' || v_order_id, 'wallet', now(),
        jsonb_build_object('order_id', v_order_id, 'payment_channel', 'wallet')
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'reference', v_tx_ref);
END;
$$;

GRANT EXECUTE ON FUNCTION public.pay_with_wallet(UUID[], UUID) TO authenticated;
