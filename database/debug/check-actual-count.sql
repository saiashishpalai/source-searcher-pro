-- Check actual file count in database for your user
SELECT 
  COUNT(*) as total_files,
  COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced_files,
  COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as error_files,
  MIN(synced_at) as first_sync,
  MAX(synced_at) as last_sync
FROM documents 
WHERE source_type = 'google_drive'
  AND user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND is_deleted = false;

-- Show all files with their sync status
SELECT 
  title,
  sync_status,
  sync_error,
  synced_at,
  LENGTH(content) as content_length
FROM documents 
WHERE source_type = 'google_drive'
  AND user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND is_deleted = false
ORDER BY synced_at DESC;

