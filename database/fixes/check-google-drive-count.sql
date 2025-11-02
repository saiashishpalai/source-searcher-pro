-- Check total Google Drive documents in database for a specific user
-- Replace the user_id with your actual user ID

SELECT 
  COUNT(*) as total_documents,
  source_type,
  COUNT(DISTINCT user_id) as users_with_drive
FROM documents 
WHERE source_type = 'google_drive'
  AND is_deleted = false
GROUP BY source_type;

-- For a specific user (replace with your user_id):
-- SELECT 
--   COUNT(*) as total_documents,
--   MIN(created_at) as first_synced,
--   MAX(synced_at) as last_synced
-- FROM documents 
-- WHERE source_type = 'google_drive'
--   AND user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
--   AND is_deleted = false;

