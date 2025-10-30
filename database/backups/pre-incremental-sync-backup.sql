-- Pre-Incremental Sync Backup
-- Run this in Supabase SQL editor BEFORE deploying incremental sync changes
-- Timestamp: now()

-- Create timestamped backup tables
DO $$
DECLARE
  ts TEXT := to_char(now(), 'YYYYMMDD_HH24MISS');
  docs_backup TEXT := 'documents_backup_' || ts;
  chunks_backup TEXT := 'document_chunks_backup_' || ts;
  conns_backup TEXT := 'user_connections_backup_' || ts;
  history_backup TEXT := 'search_history_backup_' || ts;
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I AS SELECT * FROM documents;', docs_backup);
  EXECUTE format('COMMENT ON TABLE %I IS %L;', docs_backup, 'Backup of documents before incremental sync changes');

  EXECUTE format('CREATE TABLE IF NOT EXISTS %I AS SELECT * FROM document_chunks;', chunks_backup);
  EXECUTE format('COMMENT ON TABLE %I IS %L;', chunks_backup, 'Backup of document_chunks before incremental sync changes');

  EXECUTE format('CREATE TABLE IF NOT EXISTS %I AS SELECT * FROM user_connections;', conns_backup);
  EXECUTE format('COMMENT ON TABLE %I IS %L;', conns_backup, 'Backup of user_connections before incremental sync changes');

  EXECUTE format('CREATE TABLE IF NOT EXISTS %I AS SELECT * FROM search_history;', history_backup);
  EXECUTE format('COMMENT ON TABLE %I IS %L;', history_backup, 'Backup of search_history before incremental sync changes');
END $$;

-- Quick verification queries
SELECT 'documents' AS table, COUNT(*) AS rows FROM documents
UNION ALL
SELECT 'document_chunks', COUNT(*) FROM document_chunks
UNION ALL
SELECT 'user_connections', COUNT(*) FROM user_connections
UNION ALL
SELECT 'search_history', COUNT(*) FROM search_history;


