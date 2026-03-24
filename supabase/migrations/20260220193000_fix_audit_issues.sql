-- ==============================================
-- FIX AUDIT ISSUES MIGRATION
-- ==============================================

-- 1. Add missing columns to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS budget_min NUMERIC(12,2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS budget_max NUMERIC(12,2);

-- 2. Add missing columns to location_requests table
ALTER TABLE public.location_requests ADD COLUMN IF NOT EXISTS verified_latitude DOUBLE PRECISION;
ALTER TABLE public.location_requests ADD COLUMN IF NOT EXISTS verified_longitude DOUBLE PRECISION;
ALTER TABLE public.location_requests ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- 3. Add missing columns to businesses and customers tables
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS location_verified_at TIMESTAMPTZ;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS location_verified_by UUID REFERENCES auth.users(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS location_verified_at TIMESTAMPTZ;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS location_verified_by UUID REFERENCES auth.users(id);

-- 4. Create business_wallets table for financial fields
-- This separates financial data from public business profile
CREATE TABLE IF NOT EXISTS public.business_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
    available_balance NUMERIC(12,2) DEFAULT 0,
    pending_balance NUMERIC(12,2) DEFAULT 0,
    total_withdrawn NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrating existing data (if any)
INSERT INTO public.business_wallets (business_id, available_balance, pending_balance, total_withdrawn)
SELECT id, available_balance, pending_balance, total_withdrawn FROM public.businesses
ON CONFLICT (business_id) DO NOTHING;

-- Remove financial columns from businesses table
ALTER TABLE public.businesses DROP COLUMN IF EXISTS available_balance;
ALTER TABLE public.businesses DROP COLUMN IF EXISTS pending_balance;
ALTER TABLE public.businesses DROP COLUMN IF EXISTS total_withdrawn;

-- Enable RLS on wallets
ALTER TABLE public.business_wallets ENABLE ROW LEVEL SECURITY;

-- 5. Create business_likes table
CREATE TABLE IF NOT EXISTS public.business_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (business_id, user_id)
);

ALTER TABLE public.business_likes ENABLE ROW LEVEL SECURITY;

-- 6. Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    paystack_reference TEXT UNIQUE,
    paystack_access_code TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies and Security Views

-- Profiles: Create a public view that hides sensitive info
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, user_id, full_name, user_type, avatar_url, latitude, longitude, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Businesses: Create a public view that hides sensitive info
CREATE OR REPLACE VIEW public.public_businesses AS
SELECT 
    id, user_id, company_name, industry, company_size, years_in_operation, 
    business_location, website, business_goals, target_customer_type, 
    monthly_customer_volume, budget_range, marketing_channels, 
    products_services, operating_region, cover_image_url, logo_url, 
    description, reputation_score, total_reviews, total_completed_orders, 
    verified, verification_tier, business_type, is_active, created_at
FROM public.businesses
WHERE is_active = true;

GRANT SELECT ON public.public_businesses TO anon, authenticated;

-- Restrict base tables to owners and admins
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT 
    USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view active businesses" ON public.businesses;
CREATE POLICY "Owners can view own business data" ON public.businesses FOR SELECT 
    USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Note: Other tables (products, services, etc.) remain publicly readable but 
-- we should ideally check for confirmed email for actions.

-- Updated RLS for write operations to require confirmed email (Issue 5)
-- We will update some key insertion policies
ALTER POLICY "Users can insert own profile" ON public.profiles WITH CHECK (
    auth.uid() = user_id AND (auth.jwt()->>'email_confirmed_at') IS NOT NULL
);

ALTER POLICY "Business owner can insert" ON public.businesses WITH CHECK (
    auth.uid() = user_id AND (auth.jwt()->>'email_confirmed_at') IS NOT NULL
);

ALTER POLICY "Customer can insert own data" ON public.customers WITH CHECK (
    auth.uid() = user_id AND (auth.jwt()->>'email_confirmed_at') IS NOT NULL
);

-- Business Wallets: ONLY owner and admin can see
CREATE POLICY "Owners can see their wallet" ON public.business_wallets FOR SELECT 
    USING (EXISTS (SELECT 1 FROM businesses WHERE businesses.id = business_wallets.business_id AND businesses.user_id = auth.uid()));
CREATE POLICY "Admins can see all wallets" ON public.business_wallets FOR SELECT 
    USING (public.has_role(auth.uid(), 'admin'));

-- Business Likes Policies
CREATE POLICY "Anyone can see likes" ON public.business_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON public.business_likes FOR ALL USING (auth.uid() = user_id);

-- Payment Transactions Policies
CREATE POLICY "Users can see own transactions" ON public.payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can see all transactions" ON public.payment_transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 8. Additional Database Indexes
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_services_name ON public.services(name);
CREATE INDEX IF NOT EXISTS idx_businesses_company_name ON public.businesses(company_name);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- 9. Add commission_percent to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(4,2) DEFAULT 10.0;

-- Trigger for updated_at on new tables
CREATE TRIGGER update_business_wallets_updated_at BEFORE UPDATE ON public.business_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
