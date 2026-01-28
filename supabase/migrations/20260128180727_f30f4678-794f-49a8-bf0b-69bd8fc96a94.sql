-- Remove the overly permissive service policy
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;