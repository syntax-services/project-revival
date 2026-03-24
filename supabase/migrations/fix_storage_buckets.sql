-- Create the product-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies just in case to prevent conflicts
DROP POLICY IF EXISTS "Public View product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users can upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own product-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own product-images" ON storage.objects;

DROP POLICY IF EXISTS "Public View avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Product Image Policies:
-- 1. Anyone can view product images (they are public products)
CREATE POLICY "Public View product-images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- 2. Any authenticated user can upload product images
CREATE POLICY "Authenticated Users can upload product-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- 3. Any authenticated user can update images (simplified for now to ensure they upload)
CREATE POLICY "Users can update their own product-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- 4. Any authenticated user can delete images
CREATE POLICY "Users can delete their own product-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Avatar Policies:
-- 1. Anyone can view avatars
CREATE POLICY "Public View avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- 2. Authenticated users can upload avatars
CREATE POLICY "Authenticated Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 3. Authenticated users can update avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- 4. Authenticated users can delete avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
