-- Migration to allow 'admin' in profiles.user_type and sync system_alerts RLS
-- This aligns with the 'MVP Sprint Plan' Decision 5

-- 1. Update profiles table to allow 'admin' user_type
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type IN ('customer', 'business', 'admin'));

-- 2. Ensure system_alerts RLS is robust
-- It already uses has_role(auth.uid(), 'admin'), which is the source of truth for RLS.
-- We'll add a secondary policy just in case profiles.user_type is used elsewhere.
CREATE POLICY "Admins can view alerts via profile type"
    ON public.system_alerts FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'admin'));

-- 3. Update existing admins
-- If someone already has an admin role in user_roles, ensure their profile reflects it for the UI
UPDATE public.profiles
SET user_type = 'admin'
WHERE user_id IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE role = 'admin'
);
