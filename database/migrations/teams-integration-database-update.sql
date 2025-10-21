-- Teams Integration Database Update
-- Run this in your Supabase SQL Editor to add Teams support

-- Step 1: Update user_connections table CHECK constraint
ALTER TABLE user_connections 
DROP CONSTRAINT IF EXISTS user_connections_source_type_check;

ALTER TABLE user_connections 
ADD CONSTRAINT user_connections_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Step 2: Update documents table CHECK constraint
ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_source_type_check;

ALTER TABLE documents 
ADD CONSTRAINT documents_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Step 3: Update document_chunks table CHECK constraint (if it exists)
ALTER TABLE document_chunks 
DROP CONSTRAINT IF EXISTS document_chunks_source_type_check;

ALTER TABLE document_chunks 
ADD CONSTRAINT document_chunks_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Step 4: Add token_expires_at column to user_connections if it doesn't exist
-- (Teams tokens expire, unlike Slack tokens)
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Step 5: Verify the constraints were added correctly
SELECT 'Teams integration database update completed successfully' as status;

-- Step 6: Show the current constraints
SELECT 
  conname, 
  consrc,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conname LIKE '%source_type_check%'
ORDER BY conrelid::regclass;

-- Step 7: Show the updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_connections'
AND column_name IN ('source_type', 'token_expires_at')
ORDER BY ordinal_position;
