-- Debug query to check profile avatar data
-- Run this in Supabase SQL Editor to see your profile data

-- Check your profile data
SELECT 
  id,
  email,
  name,
  avatar_url,
  created_at,
  updated_at
FROM profiles
ORDER BY updated_at DESC
LIMIT 5;

-- Check if storage bucket exists
SELECT * FROM storage.buckets WHERE name = 'profile-images';

-- Check uploaded files in storage
SELECT 
  name,
  created_at,
  metadata
FROM storage.objects 
WHERE bucket_id = 'profile-images'
ORDER BY created_at DESC
LIMIT 10;

