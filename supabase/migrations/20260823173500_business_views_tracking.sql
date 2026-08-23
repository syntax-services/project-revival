-- ==============================================================================
-- TRACK BUSINESS & SERVICE VIEWS
-- ==============================================================================
BEGIN;

-- Unique views tracker to enforce 1 account = 1 viewer
CREATE TABLE IF NOT EXISTS public.unique_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(business_id, viewer_id)
);

-- Add views counter to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Function to record a view atomically and safely
CREATE OR REPLACE FUNCTION public.record_business_view(p_business_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into unique views. If it exists, do nothing.
  INSERT INTO public.unique_views (business_id, viewer_id)
  VALUES (p_business_id, auth.uid())
  ON CONFLICT (business_id, viewer_id) DO NOTHING;

  -- If a new row was inserted, increment the count
  IF FOUND THEN
    UPDATE public.businesses
    SET views_count = views_count + 1
    WHERE id = p_business_id;
  END IF;
END;
$$;

-- Grant execute
REVOKE ALL ON FUNCTION public.record_business_view(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_business_view(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_business_view(UUID) TO service_role;

-- Grant access to unique views table
ALTER TABLE public.unique_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view unique views" ON public.unique_views FOR SELECT USING (true);
CREATE POLICY "System can insert unique views" ON public.unique_views FOR INSERT WITH CHECK (true);

COMMIT;
