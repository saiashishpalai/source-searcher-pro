-- Incremental Sync Schema Migration
-- Run this SQL in your Supabase SQL Editor

-- Add last_synced_at column to user_connections table to track when each source was last synced
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Create index for better performance on sync timestamp queries
CREATE INDEX IF NOT EXISTS idx_user_connections_last_synced_at ON user_connections(last_synced_at);

-- Add comment to document the purpose of this column
COMMENT ON COLUMN user_connections.last_synced_at IS 'Timestamp of last successful sync for this user and source type';
