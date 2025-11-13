-- Create wireframes storage bucket for sketch-to-requirements feature
-- Purpose: Store uploaded wireframe images for GPT-4 Vision analysis

-- Create the bucket (public so images can be accessed by GPT-4 Vision API)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wireframes',
  'wireframes',
  true,
  10485760, -- 10 MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for wireframes bucket
-- Note: Storage policies must be created by database owner or with proper permissions
-- If these fail with "must be owner" error, create them via Supabase Dashboard instead:
-- Storage → wireframes bucket → Policies → New Policy

-- Policy: Users can upload wireframes
CREATE POLICY IF NOT EXISTS "Users can upload wireframes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wireframes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own wireframes
CREATE POLICY IF NOT EXISTS "Users can view their wireframes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wireframes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own wireframes
CREATE POLICY IF NOT EXISTS "Users can update their wireframes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wireframes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own wireframes
CREATE POLICY IF NOT EXISTS "Users can delete their wireframes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wireframes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: The bucket is public to allow GPT-4 Vision API to access images
-- However, RLS policies ensure users can only upload/manage their own files
-- File paths follow the pattern: wireframes/{user_id}/{timestamp}.{ext}

