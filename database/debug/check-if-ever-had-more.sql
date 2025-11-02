-- Check if there were EVER more files in the past (including deleted)
SELECT 
  COUNT(*) as total_files_ever,
  COUNT(CASE WHEN is_deleted = true THEN 1 END) as deleted_count,
  COUNT(CASE WHEN is_deleted = false THEN 1 END) as active_count,
  MIN(created_at) as account_first_sync,
  MAX(created_at) as account_last_sync
FROM documents
WHERE user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND source_type = 'google_drive';

-- Check for any evidence of bulk deletion by checking sync_metadata
SELECT 
  *
FROM sync_metadata
WHERE user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND source_type = 'google_drive'
ORDER BY started_at DESC;

