-- Migration: 20260821000000_keepalive_cron.sql
-- Description: System Heartbeat table & pg_cron schedule to prevent inactivity pausing

CREATE TABLE IF NOT EXISTS public.system_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'cron',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_heartbeats ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated admins only
DROP POLICY IF EXISTS "Admins can view heartbeats" ON public.system_heartbeats;
CREATE POLICY "Admins can view heartbeats"
ON public.system_heartbeats
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Heartbeat function callable via RPC or Postgres Cron
CREATE OR REPLACE FUNCTION public.record_heartbeat(p_source TEXT DEFAULT 'cron')
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  INSERT INTO public.system_heartbeats (source, recorded_at)
  VALUES (COALESCE(p_source, 'cron'), v_now);
  
  -- Clean up old heartbeats older than 30 days to avoid table bloat
  DELETE FROM public.system_heartbeats
  WHERE recorded_at < (now() - interval '30 days');
  
  RETURN v_now;
END;
$$;

-- Attempt to schedule pg_cron job if the extension is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unschedule existing job if present
    PERFORM cron.unschedule(jobid) 
    FROM cron.job 
    WHERE jobname = 'supabase-heartbeat-keepalive';

    -- Schedule to run daily at 03:00 UTC
    PERFORM cron.schedule(
      'supabase-heartbeat-keepalive',
      '0 3 * * *',
      'SELECT public.record_heartbeat(''pg_cron'');'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If pg_cron permissions or extension are not enabled, continue safely
    RAISE NOTICE 'pg_cron job registration skipped or not supported.';
END $$;
