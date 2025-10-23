-- Fix user_connections table to ensure it exists with correct schema
-- This script ensures the table exists and has proper RLS policies

-- Drop and recreate user_connections table to ensure clean state
DROP TABLE IF EXISTS user_connections CASCADE;

-- Create user_connections table with proper schema
CREATE TABLE user_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('google_drive', 'slack', 'notion', 'teams')),
  source_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  workspace_id TEXT,
  workspace_name TEXT
);

-- Enable RLS
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON user_connections;
DROP POLICY IF EXISTS "Service role can manage all connections" ON user_connections;

-- Create RLS policies
CREATE POLICY "Users can view own connections" ON user_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON user_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON user_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON user_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all connections (for backend operations)
CREATE POLICY "Service role can manage all connections" ON user_connections
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_source_type ON user_connections(source_type);
CREATE INDEX IF NOT EXISTS idx_user_connections_is_active ON user_connections(is_active);

-- Create unique constraint for (user_id, source_type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_connections_unique ON user_connections(user_id, source_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_connections_updated_at ON user_connections;
CREATE TRIGGER update_user_connections_updated_at
    BEFORE UPDATE ON user_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON user_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_connections TO authenticated;

-- Insert test data to verify table works (only if not exists)
INSERT INTO user_connections (user_id, source_type, source_user_id, access_token, is_active)
SELECT 
  'b7a5b22c-34f5-446a-8627-112f70ba11b2',
  'teams',
  'test-user-id',
  'test-access-token',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM user_connections 
  WHERE user_id = 'b7a5b22c-34f5-446a-8627-112f70ba11b2' 
  AND source_type = 'teams'
);

-- Verify table was created successfully
SELECT 
  'user_connections table created successfully' as status,
  COUNT(*) as existing_connections
FROM user_connections;
