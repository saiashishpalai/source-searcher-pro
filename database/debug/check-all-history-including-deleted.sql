-- Check ALL documents including soft-deleted ones
SELECT 
  source_type,
  is_deleted,
  COUNT(*) as count,
  MIN(synced_at) as earliest_sync,
  MAX(synced_at) as latest_sync
FROM documents
WHERE user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND source_type = 'google_drive'
GROUP BY source_type, is_deleted
ORDER BY source_type, is_deleted;

-- Show all non-deleted Google Drive files with their chunks
SELECT 
  d.id,
  d.title,
  d.synced_at,
  LENGTH(d.content) as content_length,
  (SELECT COUNT(*) FROM document_chunks WHERE document_id = d.id) as chunks,
  d.sync_status
FROM documents d
WHERE d.user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND d.source_type = 'google_drive'
  AND d.is_deleted = false
ORDER BY d.synced_at DESC;

-- Show soft-deleted files
SELECT 
  id,
  title,
  synced_at,
  sync_status,
  sync_error
FROM documents
WHERE user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND source_type = 'google_drive'
  AND is_deleted = true
ORDER BY synced_at DESC;

