-- Fix the permissive notifications INSERT policy
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a more restrictive policy - only authenticated users can create notifications
-- (In a production app, you'd typically create notifications via edge functions with service role)
CREATE POLICY "Authenticated users can create notifications" ON public.notifications 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);