-- Debug and fix Teams constraint violation
-- Run this in your Supabase SQL Editor

-- Step 1: First, let's see what source_type values actually exist
SELECT 'Current source_type values in user_connections:' as info;
SELECT DISTINCT source_type, COUNT(*) as count
FROM user_connections 
GROUP BY source_type
ORDER BY source_type;

-- Step 2: Check if there are any NULL or empty values
SELECT 'NULL or empty source_type values:' as info;
SELECT 
  CASE 
    WHEN source_type IS NULL THEN 'NULL'
    WHEN source_type = '' THEN 'EMPTY'
    ELSE source_type
  END as source_type_status, 
  COUNT(*) as count
FROM user_connections 
WHERE source_type IS NULL OR source_type = ''
GROUP BY 
  CASE 
    WHEN source_type IS NULL THEN 'NULL'
    WHEN source_type = '' THEN 'EMPTY'
    ELSE source_type
  END;

-- Step 3: Check if there are any unexpected values
SELECT 'Unexpected source_type values:' as info;
SELECT source_type, COUNT(*) as count
FROM user_connections 
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams')
GROUP BY source_type;

-- Step 4: If we find unexpected values, let's see what they are
SELECT 'Sample of unexpected values:' as info;
SELECT id, user_id, source_type, created_at
FROM user_connections 
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams')
LIMIT 5;

-- Step 5: Now let's fix any problematic values
-- First, let's see what we're dealing with
SELECT 'About to fix these values:' as info;
SELECT source_type, COUNT(*) as count
FROM user_connections 
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams');

-- Step 6: Update any NULL or empty values to 'slack' (safe default)
UPDATE user_connections 
SET source_type = 'slack'
WHERE source_type IS NULL OR source_type = '';

-- Step 7: Update any other unexpected values to 'slack' (safe default)
UPDATE user_connections 
SET source_type = 'slack'
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams');

-- Step 8: Now drop and recreate the constraint
ALTER TABLE user_connections 
DROP CONSTRAINT IF EXISTS user_connections_source_type_check;

ALTER TABLE user_connections 
ADD CONSTRAINT user_connections_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Step 9: Do the same for documents table
UPDATE documents 
SET source_type = 'slack'
WHERE source_type IS NULL OR source_type = '' OR source_type NOT IN ('slack', 'notion', 'google_drive', 'teams');

ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_source_type_check;

ALTER TABLE documents 
ADD CONSTRAINT documents_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Step 10: Do the same for document_chunks table (if it exists)
UPDATE document_chunks 
SET source_type = 'slack'
WHERE source_type IS NULL OR source_type = '' OR source_type NOT IN ('slack', 'notion', 'google_drive', 'teams');

ALTER TABLE document_chunks 
DROP CONSTRAINT IF EXISTS document_chunks_source_type_check;

ALTER TABLE document_chunks 
ADD CONSTRAINT document_chunks_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Step 11: Verify the fix worked
SELECT 'Final source_type values after fix:' as info;
SELECT source_type, COUNT(*) as count
FROM user_connections 
GROUP BY source_type
ORDER BY source_type;

-- Step 12: Show the constraints are working
SELECT 'Constraints added successfully' as status;
SELECT 
  conname, 
  consrc,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conname LIKE '%source_type_check%'
ORDER BY conrelid::regclass;
