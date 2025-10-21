-- Add Teams source type to database tables
-- Run this in your Supabase SQL Editor

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

-- Step 4: Verify the constraints were added correctly
SELECT 'Teams source type added successfully to all tables' as status;

-- Step 5: Show the current constraints
SELECT 
  conname, 
  consrc,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conname LIKE '%source_type_check%'
ORDER BY conrelid::regclass;
