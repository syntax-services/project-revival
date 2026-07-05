-- Queue and track Squad subaccount provisioning for every String profile.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS squad_subaccount_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (squad_subaccount_status IN ('pending', 'processing', 'active', 'failed')),
  ADD COLUMN IF NOT EXISTS squad_subaccount_error TEXT,
  ADD COLUMN IF NOT EXISTS squad_subaccount_created_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.squad_subaccount_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  squad_subaccount_id TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.squad_subaccount_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage squad subaccount jobs" ON public.squad_subaccount_jobs;
CREATE POLICY "Admins can manage squad subaccount jobs"
ON public.squad_subaccount_jobs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_squad_subaccount_jobs_updated_at ON public.squad_subaccount_jobs;
CREATE TRIGGER update_squad_subaccount_jobs_updated_at
BEFORE UPDATE ON public.squad_subaccount_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.queue_squad_subaccount_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NULLIF(NEW.squad_subaccount_id, '') IS NULL THEN
    INSERT INTO public.squad_subaccount_jobs (user_id, status)
    VALUES (NEW.user_id, 'pending')
    ON CONFLICT (user_id) DO UPDATE
      SET status = CASE
          WHEN public.squad_subaccount_jobs.status = 'succeeded' THEN public.squad_subaccount_jobs.status
          ELSE 'pending'
        END,
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_squad_subaccount_after_profile_insert ON public.profiles;
CREATE TRIGGER queue_squad_subaccount_after_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.queue_squad_subaccount_job();

INSERT INTO public.squad_subaccount_jobs (user_id, status)
SELECT p.user_id, 'pending'
FROM public.profiles p
WHERE NULLIF(p.squad_subaccount_id, '') IS NULL
ON CONFLICT (user_id) DO NOTHING;
