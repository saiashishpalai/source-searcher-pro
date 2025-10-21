-- OAuth Database Schema Fix for Haven7
-- Run this SQL in your Supabase SQL Editor to ensure clean OAuth schema

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS user_connections CASCADE;

-- Create user_connections table with proper schema
CREATE TABLE user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams')),
  source_user_id TEXT,
  workspace_id TEXT,
  workspace_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_type)
);

-- Create indexes for better performance
CREATE INDEX idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX idx_user_connections_source_type ON user_connections(source_type);
CREATE INDEX idx_user_connections_is_active ON user_connections(is_active);

-- Enable Row Level Security
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can manage own connections" ON user_connections;
DROP POLICY IF EXISTS "Service role full access" ON user_connections;

-- Create RLS policies for user_connections
CREATE POLICY "Users can manage own connections"
  ON user_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to bypass RLS for server-side operations
CREATE POLICY "Service role full access"
  ON user_connections FOR ALL
  TO service_role USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON user_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_connections TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_connections_updated_at ON user_connections;
CREATE TRIGGER update_user_connections_updated_at
    BEFORE UPDATE ON user_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the schema
SELECT 'OAuth schema setup complete' as status;
