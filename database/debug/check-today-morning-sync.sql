-- Check sync activity from this morning (2025-10-30)
-- Adjust the date based on your timezone

-- Check Google Drive syncs from today morning
SELECT 
  title,
  source_type,
  sync_status,
  synced_at,
  created_at,
  LENGTH(content) as content_length,
  (SELECT COUNT(*) FROM document_chunks WHERE document_id = d.id) as chunk_count
FROM documents d
WHERE user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND source_type = 'google_drive'
  AND is_deleted = false
  AND synced_at >= '2025-10-30 00:00:00'
ORDER BY synced_at DESC;

-- Count of documents synced today morning
SELECT 
  DATE(synced_at) as sync_date,
  COUNT(*) as files_synced,
  COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as successfully_synced,
  COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as failed_syncs
FROM documents
WHERE user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND source_type = 'google_drive'
  AND synced_at >= '2025-10-30 00:00:00'
GROUP BY DATE(synced_at)
ORDER BY sync_date DESC;

-- Total chunks created from Google Drive syncs today
SELECT 
  COUNT(*) as total_chunks_from_gdrive_today
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE d.user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND d.source_type = 'google_drive'
  AND d.synced_at >= '2025-10-30 00:00:00'
  AND d.is_deleted = false;

