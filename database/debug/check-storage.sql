-- Check if there are any uploaded files in storage
SELECT 
  id,
  name,
  bucket_id,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects 
WHERE bucket_id = 'profile-images'
ORDER BY created_at DESC
LIMIT 10;

-- Check storage bucket configuration
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets 
WHERE name = 'profile-images';

