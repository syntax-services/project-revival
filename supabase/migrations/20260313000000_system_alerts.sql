-- Create system_alerts table for God Mode monitoring
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'image_search_fail', 'withdrawal_request', 'dispute'
    severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
    title TEXT NOT NULL,
    content TEXT,
    metadata JSONB,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can see and manage alerts
CREATE POLICY "Admins can see all alerts"
    ON public.system_alerts FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alerts"
    ON public.system_alerts FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Allow anyone (authenticated) to insert alerts (e.g. image search fail)
CREATE POLICY "Anyone can create alerts"
    ON public.system_alerts FOR INSERT
    TO authenticated
    WITH CHECK (true);
