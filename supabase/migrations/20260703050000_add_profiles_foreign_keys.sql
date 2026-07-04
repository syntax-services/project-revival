-- ============================================================================
-- ADD FOREIGN KEYS TO LINK BUSINESSES, CUSTOMERS, AND LOCATION_REQUESTS TO PROFILES
-- ============================================================================

-- Clean up orphans defensively first
DELETE FROM public.businesses WHERE user_id NOT IN (SELECT user_id FROM public.profiles);
DELETE FROM public.customers WHERE user_id NOT IN (SELECT user_id FROM public.profiles);
DELETE FROM public.location_requests WHERE user_id NOT IN (SELECT user_id FROM public.profiles);

-- Add foreign key constraints referencing profiles(user_id)
ALTER TABLE public.businesses 
DROP CONSTRAINT IF EXISTS fk_businesses_profiles,
ADD CONSTRAINT fk_businesses_profiles 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS fk_customers_profiles,
ADD CONSTRAINT fk_customers_profiles 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

ALTER TABLE public.location_requests 
DROP CONSTRAINT IF EXISTS fk_location_requests_profiles,
ADD CONSTRAINT fk_location_requests_profiles 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;
