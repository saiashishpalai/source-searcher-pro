-- Fix Teams constraint violation by updating existing data
-- Run this in your Supabase SQL Editor

-- Step 1: Check what source_type values currently exist
SELECT DISTINCT source_type, COUNT(*) as count
FROM user_connections 
GROUP BY source_type
ORDER BY source_type;

-- Step 2: Check if there are any invalid source_type values
SELECT source_type, COUNT(*) as count
FROM user_connections 
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams')
GROUP BY source_type;

-- Step 3: If there are invalid values, update them to valid ones
-- (This is a safety measure - update any unexpected values to 'slack' as default)
-- BUT ONLY if there's no existing 'slack' record for the same user
UPDATE user_connections 
SET source_type = 'slack'
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams')
AND NOT EXISTS (
  SELECT 1 FROM user_connections uc2 
  WHERE uc2.user_id = user_connections.user_id 
  AND uc2.source_type = 'slack'
);

-- Step 4: Now drop and recreate the constraint
ALTER TABLE user_connections 
DROP CONSTRAINT IF EXISTS user_connections_source_type_check;

ALTER TABLE user_connections 
ADD CONSTRAINT user_connections_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Step 5: Do the same for documents table
UPDATE documents 
SET source_type = 'slack'
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams');

ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_source_type_check;

ALTER TABLE documents 
ADD CONSTRAINT documents_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Step 6: Do the same for document_chunks table (if it exists)
UPDATE document_chunks 
SET source_type = 'slack'
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams');

ALTER TABLE document_chunks 
DROP CONSTRAINT IF EXISTS document_chunks_source_type_check;

ALTER TABLE document_chunks 
ADD CONSTRAINT document_chunks_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Step 7: Verify the fix worked
SELECT 'Constraint violation fixed successfully' as status;

-- Step 8: Show final source_type distribution
SELECT 
  'user_connections' as table_name,
  source_type, 
  COUNT(*) as count
FROM user_connections 
GROUP BY source_type
UNION ALL
SELECT 
  'documents' as table_name,
  source_type, 
  COUNT(*) as count
FROM documents 
GROUP BY source_type
ORDER BY table_name, source_type;
