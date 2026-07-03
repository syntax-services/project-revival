-- Migration: Immutable Compliance Archives and Escrow Support
-- Description: Sets up kyc/transaction archive tables, triggers to intercept delete cascades, and probation helpers.

-- 1. Add pending_escrow column to business_wallets
ALTER TABLE public.business_wallets ADD COLUMN IF NOT EXISTS pending_escrow NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- 2. Create KYC Archive table
CREATE TABLE IF NOT EXISTS public.immutable_kyc_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  verification_level INTEGER,
  nin_hash TEXT,
  bvn_hash TEXT,
  created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on KYC Archive (Admins only)
ALTER TABLE public.immutable_kyc_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view kyc archive" ON public.immutable_kyc_archive;
CREATE POLICY "Admins can view kyc archive" ON public.immutable_kyc_archive
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create Transaction Archive table
CREATE TABLE IF NOT EXISTS public.immutable_transaction_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  original_id UUID NOT NULL,
  user_id UUID,
  business_id UUID,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL,
  payment_method TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on Transaction Archive (Admins only)
ALTER TABLE public.immutable_transaction_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view transaction archive" ON public.immutable_transaction_archive;
CREATE POLICY "Admins can view transaction archive" ON public.immutable_transaction_archive
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 4. Create trigger to archive profile before delete
CREATE OR REPLACE FUNCTION public.archive_profile_before_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.immutable_kyc_archive (
    user_id, full_name, email, phone, verification_level, nin_hash, bvn_hash, created_at
  ) VALUES (
    OLD.user_id, OLD.full_name, OLD.email, OLD.phone, OLD.verification_level, OLD.nin_hash, OLD.bvn_hash, OLD.created_at
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_archive_profile_before_delete ON public.profiles;
CREATE TRIGGER trg_archive_profile_before_delete
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.archive_profile_before_delete();

-- 5. Create trigger to archive payment transaction before delete
CREATE OR REPLACE FUNCTION public.archive_transaction_before_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.immutable_transaction_archive (
    source_table, original_id, user_id, amount, status, payment_method, metadata, created_at
  ) VALUES (
    'payment_transactions', OLD.id, OLD.user_id, OLD.amount, OLD.status, OLD.payment_method, OLD.metadata, OLD.created_at
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_archive_payment_transaction ON public.payment_transactions;
CREATE TRIGGER trg_archive_payment_transaction
BEFORE DELETE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.archive_transaction_before_delete();

-- 6. Create trigger to archive withdrawal request before delete
CREATE OR REPLACE FUNCTION public.archive_withdrawal_before_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM public.businesses WHERE id = OLD.business_id;
  
  INSERT INTO public.immutable_transaction_archive (
    source_table, original_id, user_id, business_id, amount, status, bank_name, account_number, account_name, created_at
  ) VALUES (
    'withdrawal_requests', OLD.id, v_user_id, OLD.business_id, OLD.amount, OLD.status, OLD.bank_name, OLD.account_number, OLD.account_name, OLD.created_at
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_archive_withdrawal_request ON public.withdrawal_requests;
CREATE TRIGGER trg_archive_withdrawal_request
BEFORE DELETE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.archive_withdrawal_before_delete();

-- 7. Define probation status checker for service vendors
CREATE OR REPLACE FUNCTION public.is_vendor_on_probation(p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT COUNT(*) FROM public.jobs WHERE business_id = p_business_id AND status = 'completed'), 0
  ) < 5;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
