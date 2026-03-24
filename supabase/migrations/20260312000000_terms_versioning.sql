-- Migration to add Terms and Conditions versioning to profiles
-- This allows for mandatory terms acceptance on platform updates

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accepted_terms_version INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Add a system configuration table for platform-wide settings
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Initialize the latest_terms_version
INSERT INTO public.system_config (key, value)
VALUES ('latest_terms_version', '1'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Policies for system_config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system_config" ON public.system_config
    FOR SELECT USING (true);

CREATE POLICY "Admins can update system_config" ON public.system_config
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));
