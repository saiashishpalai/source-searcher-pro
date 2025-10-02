-- User Connections Table Schema for Haven7
-- This table stores OAuth connections to external services
-- Run this SQL in your Supabase SQL Editor

-- Create user_connections table
CREATE TABLE IF NOT EXISTS user_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('slack', 'notion', 'google_drive')),
  source_user_id TEXT NOT NULL, -- The user ID from the external service (e.g., Google user ID)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}', -- Store additional user info (email, name, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  
  -- Ensure one connection per user per source type
  UNIQUE(user_id, source_type)
);

-- Enable Row Level Security
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for user_connections (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON user_connections;

-- Allow service role to bypass RLS for server-side operations
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_source_type ON user_connections(source_type);
CREATE INDEX IF NOT EXISTS idx_user_connections_active ON user_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_user_connections_unique ON user_connections(user_id, source_type);

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
