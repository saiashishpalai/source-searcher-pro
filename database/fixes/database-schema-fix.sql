-- Database Schema Fix for Haven7
-- Run this SQL in your Supabase SQL Editor to align schema with code

-- First, let's check what tables exist and fix inconsistencies
-- The code expects 'user_connections' table, but some parts use 'user_sources'

-- Drop the old user_sources table if it exists (since code uses user_connections)
DROP TABLE IF EXISTS user_sources CASCADE;

-- Create user_connections table (this is what the TypeScript types expect)
CREATE TABLE IF NOT EXISTS user_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams')),
  source_name TEXT,
  source_user_id TEXT,
  workspace_id TEXT,
  workspace_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_type)
);

-- Enable Row Level Security
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON user_connections;

-- Create RLS policies for user_connections
CREATE POLICY "Users can view own connections" ON user_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON user_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON user_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON user_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_source_type ON user_connections(source_type);
CREATE INDEX IF NOT EXISTS idx_user_connections_is_active ON user_connections(is_active);

-- Also create the integrations table as mentioned in the prompt (for future use)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  status TEXT DEFAULT 'connected',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Enable RLS for integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for integrations
CREATE POLICY "Users can view own integrations" ON integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations" ON integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for integrations
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);

-- Update any existing data from user_sources to user_connections (if needed)
-- This is commented out since we're dropping user_sources anyway
-- INSERT INTO user_connections (user_id, source_type, source_name, access_token, refresh_token, is_active, created_at)
-- SELECT user_id, source_type, source_name, access_token, refresh_token, is_connected, created_at
-- FROM user_sources
-- ON CONFLICT (user_id, source_type) DO NOTHING;

-- Verify the schema
SELECT 'Schema verification complete' as status;
