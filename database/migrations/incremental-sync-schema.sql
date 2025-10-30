-- Incremental Sync Schema

-- 1) sync_metadata table to track per-user/source sync state
CREATE TABLE IF NOT EXISTS sync_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('google_drive', 'slack', 'notion')),
  last_sync_at TIMESTAMPTZ,
  last_full_sync_at TIMESTAMPTZ,
  last_page_token TEXT,
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle','running','completed','failed')),
  sync_type TEXT CHECK (sync_type IN ('full','incremental')),
  files_processed INTEGER DEFAULT 0,
  files_skipped INTEGER DEFAULT 0,
  files_errored INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_type)
);

-- Enable RLS and basic policies
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sync metadata" ON sync_metadata;
CREATE POLICY "Users can view own sync metadata" ON sync_metadata
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own sync metadata" ON sync_metadata;
CREATE POLICY "Users can manage own sync metadata" ON sync_metadata
  FOR ALL USING (auth.uid() = user_id);

-- 2) Enhance documents table
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','error')),
  ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- 3) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_content_hash 
  ON documents(user_id, source_type, content_hash);

CREATE INDEX IF NOT EXISTS idx_documents_modified 
  ON documents(user_id, source_type, last_modified_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_source_id 
  ON documents(user_id, source_id);

-- 4) Sync stats function
CREATE OR REPLACE FUNCTION get_sync_stats(p_user_id UUID, p_source_type TEXT)
RETURNS TABLE (
  total_documents BIGINT,
  total_chunks BIGINT,
  last_sync_at TIMESTAMPTZ,
  last_sync_type TEXT,
  files_in_last_sync INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM documents WHERE user_id = p_user_id AND source_type = p_source_type AND is_deleted = false),
    (SELECT COUNT(*) FROM document_chunks dc 
       JOIN documents d ON dc.document_id = d.id 
       WHERE d.user_id = p_user_id AND d.source_type = p_source_type),
    sm.last_sync_at,
    sm.sync_type,
    sm.files_processed
  FROM sync_metadata sm
  WHERE sm.user_id = p_user_id AND sm.source_type = p_source_type;
END;
$$ LANGUAGE plpgsql;

-- Incremental Sync Schema Migration
-- Run this SQL in your Supabase SQL Editor

-- Add last_synced_at column to user_connections table to track when each source was last synced
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Create index for better performance on sync timestamp queries
CREATE INDEX IF NOT EXISTS idx_user_connections_last_synced_at ON user_connections(last_synced_at);

-- Add comment to document the purpose of this column
COMMENT ON COLUMN user_connections.last_synced_at IS 'Timestamp of last successful sync for this user and source type';
