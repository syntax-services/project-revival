-- Migration to add parent_id to reviews for nested comments
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE;
