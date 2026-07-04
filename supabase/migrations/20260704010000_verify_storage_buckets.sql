-- Ensure storage buckets exist and are public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies on storage.objects to avoid naming conflicts
DROP POLICY IF EXISTS "Public View product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users can upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own product-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own product-images" ON storage.objects;

DROP POLICY IF EXISTS "service-images public select" ON storage.objects;
DROP POLICY IF EXISTS "service-images auth insert" ON storage.objects;
DROP POLICY IF EXISTS "service-images auth delete" ON storage.objects;

DROP POLICY IF EXISTS "Public View avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Re-create simplified, bulletproof storage policies with less restrictions
-- 1. Product Images
CREATE POLICY "Public View product-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated Users can upload product-images" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Users can update their own product-images" ON storage.objects 
FOR UPDATE TO authenticated USING (bucket_id = 'product-images');

CREATE POLICY "Users can delete their own product-images" ON storage.objects 
FOR DELETE TO authenticated USING (bucket_id = 'product-images');

-- 2. Service Images
CREATE POLICY "Public View service-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'service-images');

CREATE POLICY "Authenticated Users can upload service-images" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'service-images');

CREATE POLICY "Users can update their own service-images" ON storage.objects 
FOR UPDATE TO authenticated USING (bucket_id = 'service-images');

CREATE POLICY "Users can delete their own service-images" ON storage.objects 
FOR DELETE TO authenticated USING (bucket_id = 'service-images');

-- 3. Avatars
CREATE POLICY "Public View avatars" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Users can upload avatars" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars" ON storage.objects 
FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatars" ON storage.objects 
FOR DELETE TO authenticated USING (bucket_id = 'avatars');
