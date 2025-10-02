-- Database Migration Script for Haven7 OAuth Fix
-- This script will fix the user_connections table schema to include missing columns and triggers
-- Run this in your Supabase SQL Editor

-- Step 1: Backup existing data (create a backup table)
CREATE TABLE IF NOT EXISTS user_connections_backup AS 
SELECT * FROM user_connections;

-- Step 2: Add missing columns to existing table
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS source_user_id TEXT;

ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 3: Update existing records to populate new columns
UPDATE user_connections 
SET 
  source_user_id = COALESCE(workspace_id, 'unknown'),
  created_at = COALESCE(connected_at, NOW()),
  updated_at = COALESCE(connected_at, NOW())
WHERE source_user_id IS NULL OR created_at IS NULL OR updated_at IS NULL;

-- Step 4: Create or replace the timestamp update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_user_connections_updated_at ON user_connections;
CREATE TRIGGER update_user_connections_updated_at
    BEFORE UPDATE ON user_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Ensure unique constraint exists
ALTER TABLE user_connections 
DROP CONSTRAINT IF EXISTS user_connections_user_id_source_type_key;

ALTER TABLE user_connections 
ADD CONSTRAINT user_connections_user_id_source_type_key 
UNIQUE (user_id, source_type);

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_source_type ON user_connections(source_type);
CREATE INDEX IF NOT EXISTS idx_user_connections_active ON user_connections(is_active);

-- Step 8: Enable Row Level Security if not already enabled
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON user_connections;
DROP POLICY IF EXISTS "Service role can manage all connections" ON user_connections;

CREATE POLICY "Users can view own connections" ON user_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON user_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON user_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON user_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Allow service role to bypass RLS (for server-side OAuth operations)
CREATE POLICY "Service role can manage all connections" ON user_connections
  FOR ALL USING (current_setting('role') = 'service_role');

-- Step 10: Verify the migration worked
SELECT 'Migration completed successfully. Table structure:' as status;

-- Show current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_connections'
ORDER BY ordinal_position;

-- Show sample data
SELECT id, user_id, source_type, source_user_id, is_active, created_at, updated_at
FROM user_connections
LIMIT 3;
