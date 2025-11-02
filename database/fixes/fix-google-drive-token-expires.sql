-- Fix Google Drive connections that don't have token_expires_at set
-- This migration sets a default expiration time for existing connections

-- For connections without token_expires_at, set it to 1 hour from now
-- This will make them appear as recently refreshed tokens
UPDATE user_connections 
SET token_expires_at = NOW() + INTERVAL '1 hour',
    updated_at = NOW()
WHERE source_type = 'google_drive' 
  AND token_expires_at IS NULL
  AND access_token IS NOT NULL;

-- Verify the update
SELECT 
  id, 
  source_type, 
  token_expires_at, 
  updated_at,
  CASE 
    WHEN refresh_token IS NULL THEN '❌ No refresh token'
    ELSE '✅ Has refresh token'
  END as refresh_token_status
FROM user_connections 
WHERE source_type = 'google_drive';

