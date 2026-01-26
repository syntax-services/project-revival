-- Add nicknames field to products table for alternative names
ALTER TABLE public.products ADD COLUMN nicknames text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.products.nicknames IS 'Alternative names or popular nicknames for the product';