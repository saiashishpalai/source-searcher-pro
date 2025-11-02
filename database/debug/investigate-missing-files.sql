-- Investigate missing Google Drive files
-- Replace 'YOUR_USER_ID' with your actual user ID: b7a5b22c-34f5-446a-8627-112f70ba11b2

-- 1. Check total Google Drive documents in database
SELECT 
  source_type,
  COUNT(*) as total_files,
  MIN(created_at) as first_file_date,
  MAX(synced_at) as last_sync_date
FROM documents 
WHERE source_type = 'google_drive'
  AND is_deleted = false
GROUP BY source_type;

-- 2. Check for YOUR specific user
SELECT 
  user_id,
  COUNT(*) as your_files,
  MIN(created_at) as your_first_file,
  MAX(synced_at) as your_last_sync
FROM documents 
WHERE source_type = 'google_drive'
  AND user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND is_deleted = false
GROUP BY user_id;

-- 2b. Get recent file titles for YOUR user
SELECT 
  title,
  synced_at
FROM documents 
WHERE source_type = 'google_drive'
  AND user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND is_deleted = false
ORDER BY synced_at DESC
LIMIT 10;

-- 3. Check all Google Drive documents for YOUR user (shows titles)
SELECT 
  id,
  title,
  source_id,
  sync_status,
  created_at,
  synced_at,
  last_modified_at,
  LENGTH(content) as content_length
FROM documents 
WHERE source_type = 'google_drive'
  AND user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND is_deleted = false
ORDER BY synced_at DESC;

-- 4. Check for soft-deleted files
SELECT 
  COUNT(*) as soft_deleted_count
FROM documents 
WHERE source_type = 'google_drive'
  AND user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND is_deleted = true;

-- 5. Check chunk count for YOUR user
SELECT 
  COUNT(*) as total_chunks,
  COUNT(DISTINCT document_id) as documents_with_chunks
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE d.source_type = 'google_drive'
  AND d.user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND d.is_deleted = false;

-- 6. Check sync metadata
SELECT 
  *
FROM sync_metadata
WHERE user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND source_type = 'google_drive'
ORDER BY started_at DESC
LIMIT 5;

-- 7. Check when files were last synced (grouped by day)
SELECT 
  DATE(synced_at) as sync_date,
  COUNT(*) as files_synced
FROM documents 
WHERE source_type = 'google_drive'
  AND user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND is_deleted = false
GROUP BY DATE(synced_at)
ORDER BY sync_date DESC;

-- 8. Check for any errors in syncing
SELECT 
  title,
  sync_status,
  sync_error,
  synced_at
FROM documents 
WHERE source_type = 'google_drive'
  AND user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND (sync_error IS NOT NULL OR sync_status = 'error')
ORDER BY synced_at DESC;

