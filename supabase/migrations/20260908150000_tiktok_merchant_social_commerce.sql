-- ==============================================================================
-- STRING TIKTOK MERCHANT SOCIAL COMMERCE & AUTO-BOOST ENGINE
-- ==============================================================================
BEGIN;

-- Compatibility: Ensure businesses has owner_id or maps to user_id safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN owner_id UUID REFERENCES auth.users(id);
        UPDATE public.businesses SET owner_id = user_id WHERE owner_id IS NULL;
    END IF;
END $$;

-- 1. Table: Business TikTok Connections (OAuth & Token Storage)
CREATE TABLE IF NOT EXISTS public.business_tiktok_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    tiktok_open_id TEXT NOT NULL,
    tiktok_username TEXT,
    tiktok_display_name TEXT,
    tiktok_avatar_url TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT NOT NULL,
    is_connected BOOLEAN DEFAULT true,
    auto_boost_enabled BOOLEAN DEFAULT true,
    auto_boost_frequency TEXT DEFAULT 'weekly' CHECK (auto_boost_frequency IN ('daily', 'weekly', 'biweekly')),
    total_promotions_posted INTEGER DEFAULT 0,
    total_tiktok_views INTEGER DEFAULT 0,
    total_tiktok_likes INTEGER DEFAULT 0,
    last_promoted_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_business_tiktok UNIQUE (business_id)
);

-- Index for rapid lookup
CREATE INDEX IF NOT EXISTS idx_business_tiktok_business_id ON public.business_tiktok_connections(business_id);
CREATE INDEX IF NOT EXISTS idx_business_tiktok_open_id ON public.business_tiktok_connections(tiktok_open_id);

-- 2. Table: TikTok Product Promotions (Log of Published Posts & Video Analytics)
CREATE TABLE IF NOT EXISTS public.tiktok_product_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    tiktok_publish_id TEXT,
    tiktok_post_id TEXT,
    video_url TEXT,
    caption TEXT,
    product_backlink_url TEXT NOT NULL,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PUBLISHED' CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tiktok_promotions_business ON public.tiktok_product_promotions(business_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_promotions_product ON public.tiktok_product_promotions(product_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.business_tiktok_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_product_promotions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Business owners can view own TikTok connection" ON public.business_tiktok_connections;
DROP POLICY IF EXISTS "Business owners can update own TikTok connection" ON public.business_tiktok_connections;
DROP POLICY IF EXISTS "Business owners can view own TikTok promotions" ON public.tiktok_product_promotions;

-- Policy: Business owners can view their own TikTok connection
CREATE POLICY "Business owners can view own TikTok connection"
ON public.business_tiktok_connections
FOR SELECT
TO authenticated
USING (
    business_id IN (
        SELECT b.id FROM public.businesses b WHERE b.user_id = auth.uid() OR b.owner_id = auth.uid()
    )
);

-- Policy: Business owners can update their own TikTok connection settings (e.g. toggle auto-boost)
CREATE POLICY "Business owners can update own TikTok connection"
ON public.business_tiktok_connections
FOR UPDATE
TO authenticated
USING (
    business_id IN (
        SELECT b.id FROM public.businesses b WHERE b.user_id = auth.uid() OR b.owner_id = auth.uid()
    )
)
WITH CHECK (
    business_id IN (
        SELECT b.id FROM public.businesses b WHERE b.user_id = auth.uid() OR b.owner_id = auth.uid()
    )
);

-- Policy: Business owners can view their promotion history
CREATE POLICY "Business owners can view own TikTok promotions"
ON public.tiktok_product_promotions
FOR SELECT
TO authenticated
USING (
    business_id IN (
        SELECT b.id FROM public.businesses b WHERE b.user_id = auth.uid() OR b.owner_id = auth.uid()
    )
);

-- 4. Atomic RPC: Upsert TikTok Connection
CREATE OR REPLACE FUNCTION public.connect_or_update_business_tiktok(
    p_business_id UUID,
    p_tiktok_open_id TEXT,
    p_tiktok_username TEXT,
    p_tiktok_display_name TEXT,
    p_tiktok_avatar_url TEXT,
    p_access_token TEXT,
    p_refresh_token TEXT,
    p_expires_in INTEGER,
    p_refresh_expires_in INTEGER,
    p_scope TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expires_at TIMESTAMPTZ := now() + (p_expires_in || ' seconds')::INTERVAL;
    v_refresh_expires_at TIMESTAMPTZ := now() + (p_refresh_expires_in || ' seconds')::INTERVAL;
    v_connection_id UUID;
BEGIN
    -- Verify caller owns this business
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = p_business_id AND (user_id = auth.uid() OR owner_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Caller does not own this business profile.';
    END IF;

    INSERT INTO public.business_tiktok_connections (
        business_id,
        tiktok_open_id,
        tiktok_username,
        tiktok_display_name,
        tiktok_avatar_url,
        access_token,
        refresh_token,
        expires_at,
        refresh_expires_at,
        scope,
        is_connected,
        updated_at
    ) VALUES (
        p_business_id,
        p_tiktok_open_id,
        p_tiktok_username,
        p_tiktok_display_name,
        p_tiktok_avatar_url,
        p_access_token,
        p_refresh_token,
        v_expires_at,
        v_refresh_expires_at,
        p_scope,
        true,
        now()
    )
    ON CONFLICT (business_id) DO UPDATE SET
        tiktok_open_id = EXCLUDED.tiktok_open_id,
        tiktok_username = EXCLUDED.tiktok_username,
        tiktok_display_name = EXCLUDED.tiktok_display_name,
        tiktok_avatar_url = EXCLUDED.tiktok_avatar_url,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        refresh_expires_at = EXCLUDED.refresh_expires_at,
        scope = EXCLUDED.scope,
        is_connected = true,
        updated_at = now()
    RETURNING id INTO v_connection_id;

    RETURN jsonb_build_object(
        'success', true,
        'connection_id', v_connection_id,
        'username', p_tiktok_username
    );
END;
$$;

-- 5. Atomic RPC: Disconnect Business TikTok
CREATE OR REPLACE FUNCTION public.disconnect_business_tiktok(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = p_business_id AND (user_id = auth.uid() OR owner_id = auth.uid())
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Caller does not own this business profile.';
    END IF;

    UPDATE public.business_tiktok_connections
    SET is_connected = false,
        access_token = 'REVOKED',
        refresh_token = 'REVOKED',
        updated_at = now()
    WHERE business_id = p_business_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.connect_or_update_business_tiktok TO authenticated;
GRANT EXECUTE ON FUNCTION public.disconnect_business_tiktok TO authenticated;

COMMIT;
