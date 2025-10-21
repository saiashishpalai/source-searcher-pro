-- Fix invalid data first, then add Teams constraint
-- Run this in your Supabase SQL Editor

-- Step 1: See what source_type values exist
SELECT 'Current source_type values:' as info;
SELECT source_type, COUNT(*) as count
FROM user_connections 
GROUP BY source_type
ORDER BY source_type;

-- Step 2: Find any invalid values
SELECT 'Invalid source_type values:' as info;
SELECT source_type, COUNT(*) as count
FROM user_connections 
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams')
GROUP BY source_type;

-- Step 3: Fix any invalid values by updating them to 'slack'
UPDATE user_connections 
SET source_type = 'slack'
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams');

-- Step 4: Fix any NULL or empty values
UPDATE user_connections 
SET source_type = 'slack'
WHERE source_type IS NULL OR source_type = '';

-- Step 5: Do the same for documents table
UPDATE documents 
SET source_type = 'slack'
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams')
   OR source_type IS NULL 
   OR source_type = '';

-- Step 6: Do the same for document_chunks table (if it exists)
UPDATE document_chunks 
SET source_type = 'slack'
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams')
   OR source_type IS NULL 
   OR source_type = '';

-- Step 7: Now drop and recreate constraints
ALTER TABLE user_connections 
DROP CONSTRAINT IF EXISTS user_connections_source_type_check;

ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_source_type_check;

ALTER TABLE document_chunks 
DROP CONSTRAINT IF EXISTS document_chunks_source_type_check;

-- Step 8: Add new constraints that include 'teams'
ALTER TABLE user_connections 
ADD CONSTRAINT user_connections_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

ALTER TABLE documents 
ADD CONSTRAINT documents_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

ALTER TABLE document_chunks 
ADD CONSTRAINT document_chunks_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Step 9: Add token_expires_at column if it doesn't exist
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Step 10: Verify the fix worked
SELECT 'Final source_type values after fix:' as info;
SELECT source_type, COUNT(*) as count
FROM user_connections 
GROUP BY source_type
ORDER BY source_type;

-- Step 11: Show constraints are working
SELECT 'Constraints added successfully' as status;
SELECT 
  conname, 
  consrc,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conname LIKE '%source_type_check%'
ORDER BY conrelid::regclass;
