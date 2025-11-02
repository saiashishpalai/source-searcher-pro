-- Final breakdown by source
SELECT 
  source_type,
  COUNT(*) as total_documents
FROM documents 
WHERE user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2'
  AND is_deleted = false
GROUP BY source_type
ORDER BY source_type;

