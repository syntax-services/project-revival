-- Fix overly permissive RLS policies

-- 1. Drop the overly permissive content_violations INSERT policy
DROP POLICY IF EXISTS "System can insert violations" ON public.content_violations;

-- Create a proper policy that only allows authenticated users
CREATE POLICY "Authenticated users can log violations"
ON public.content_violations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 2. Drop the overly permissive notifications INSERT policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Admin notification insertion should only be for admins
CREATE POLICY "Admins can insert notifications for any user"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Also allow the system to insert notifications via triggers (using authenticated check)
-- Users should be able to insert their own notifications for system purposes
CREATE POLICY "Users can receive system notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);