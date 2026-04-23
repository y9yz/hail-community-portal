
-- 1. Add is_verified to profiles (default false for new users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- 2. Add license_url to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS license_url text;

-- 3. Create public-assets bucket (service images, public)
INSERT INTO storage.buckets (id, name, public) VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Create private-documents bucket (licenses, private)
INSERT INTO storage.buckets (id, name, public) VALUES ('private-documents', 'private-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS: public-assets - anyone can view
CREATE POLICY "Public can view public-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- Authenticated users can upload to public-assets (in their own folder)
CREATE POLICY "Authenticated users upload to public-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own files in public-assets
CREATE POLICY "Users update own public-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 6. Storage RLS: private-documents - only admins can read
CREATE POLICY "Admins can view private-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'private-documents' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can upload to private-documents (in their own folder)
CREATE POLICY "Authenticated users upload to private-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'private-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 7. RLS policy so admins can update is_verified on profiles
CREATE POLICY "Admins update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
