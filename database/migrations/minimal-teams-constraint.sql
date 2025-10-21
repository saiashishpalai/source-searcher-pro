-- Minimal Teams constraint addition
-- Run this in your Supabase SQL Editor

-- Step 1: Check what source_type values currently exist
SELECT 'Current source_type values:' as info;
SELECT source_type, COUNT(*) as count
FROM user_connections 
GROUP BY source_type
ORDER BY source_type;

-- Step 2: Drop existing constraints
ALTER TABLE user_connections 
DROP CONSTRAINT IF EXISTS user_connections_source_type_check;

ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_source_type_check;

ALTER TABLE document_chunks 
DROP CONSTRAINT IF EXISTS document_chunks_source_type_check;

-- Step 3: Add new constraints that include 'teams'
ALTER TABLE user_connections 
ADD CONSTRAINT user_connections_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

ALTER TABLE documents 
ADD CONSTRAINT documents_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

ALTER TABLE document_chunks 
ADD CONSTRAINT document_chunks_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Step 4: Add token_expires_at column if it doesn't exist
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Step 5: Verify the constraints were added successfully
SELECT 'Teams constraint added successfully' as status;

-- Step 6: Show the current constraints
SELECT 
  conname, 
  consrc,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conname LIKE '%source_type_check%'
ORDER BY conrelid::regclass;
