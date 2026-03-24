-- Migration: Secure Financial Settlement RPCs
-- Description: Adds atomic functions for settling orders and jobs, moving funds from pending to available balance.

-- Function to settle an order (move funds from pending to available)
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
    WHERE id = p_order_id AND status IN ('confirmed', 'processing', 'shipped')
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
        delivered_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 4. Update business wallet atomically
    -- Lock the wallet row to prevent race conditions
    SELECT * INTO v_wallet 
    FROM public.business_wallets 
    WHERE business_id = v_order.business_id
    FOR UPDATE;

    IF v_wallet IS NULL THEN
        -- Create wallet if it doesn't exist (though it should have been created by webhook)
        INSERT INTO public.business_wallets (business_id, pending_balance, available_balance, updated_at)
        VALUES (v_order.business_id, 0, v_net_payout, NOW());
    ELSE
        UPDATE public.business_wallets
        SET pending_balance = GREATEST(0, pending_balance - v_net_payout),
            available_balance = available_balance + v_net_payout,
            updated_at = NOW()
        WHERE business_id = v_order.business_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'net_payout', v_net_payout);
END;
$$;

-- Function to settle a job (move funds from pending to available)
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

    -- 2. Calculate net payout (using 10% commission rule as defined in webhook)
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

    -- 4. Update business wallet atomically
    SELECT * INTO v_wallet 
    FROM public.business_wallets 
    WHERE business_id = v_job.business_id
    FOR UPDATE;

    IF v_wallet IS NULL THEN
        INSERT INTO public.business_wallets (business_id, pending_balance, available_balance, updated_at)
        VALUES (v_job.business_id, 0, v_net_payout, NOW());
    ELSE
        -- Note: For jobs, we assume the initial quoted_price * 0.9 was added to pending by the webhook.
        -- If the final_price differs, we adjust accordingly.
        DECLARE
            v_initial_pending_payout NUMERIC;
        BEGIN
            v_initial_pending_payout := ROUND(COALESCE(v_job.quoted_price, 0) * 0.9);
            
            UPDATE public.business_wallets
            SET pending_balance = GREATEST(0, pending_balance - v_initial_pending_payout),
                available_balance = available_balance + v_net_payout,
                updated_at = NOW()
            WHERE business_id = v_job.business_id;
        END;
    END IF;

    RETURN jsonb_build_object('success', true, 'net_payout', v_net_payout);
END;
$$;
