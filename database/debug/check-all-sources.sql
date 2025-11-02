-- Check total documents across ALL sources for your user
SELECT 
  source_type,
  COUNT(*) as total_documents,
  COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as synced_count,
  COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as error_count,
  MIN(synced_at) as first_sync,
  MAX(synced_at) as last_sync
FROM documents 
WHERE user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND is_deleted = false
GROUP BY source_type
ORDER BY source_type;

-- Overall total
SELECT 
  COUNT(*) as total_documents_all_sources
FROM documents 
WHERE user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND is_deleted = false;

