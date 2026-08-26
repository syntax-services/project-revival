-- 1. Product Stock Management
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_unlimited_stock BOOLEAN DEFAULT false;

-- 2. Business Operating Hours
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS opening_time TIME;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS closing_time TIME;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_open_now BOOLEAN DEFAULT true;

-- 3. User Online Presence
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();

-- 4. Chat Context & Proximity Tools
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS context_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS tool_payload JSONB;

-- 5. Verified Sales Table (For Proximity Meetups)
CREATE TABLE IF NOT EXISTS public.chat_verified_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    confirmed_at TIMESTAMPTZ DEFAULT now(),
    buyer_lat DOUBLE PRECISION,
    buyer_lng DOUBLE PRECISION,
    seller_lat DOUBLE PRECISION,
    seller_lng DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION
);
