-- Final Teams Fix - Delete invalid rows instead of updating
-- Run this in your Supabase SQL Editor

-- ========================================
-- STEP 1: INVESTIGATE THE DATA
-- ========================================

-- See ALL source_type values that exist
SELECT 'All source_type values:' as step;
SELECT source_type, COUNT(*) as count
FROM user_connections 
GROUP BY source_type
ORDER BY source_type;

-- ========================================
-- STEP 2: FIND INVALID ROWS
-- ========================================

-- Show invalid rows (these will be DELETED)
SELECT 'Invalid rows that will be DELETED:' as step;
SELECT id, user_id, source_type, created_at
FROM user_connections 
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams')
   OR source_type IS NULL 
   OR source_type = ''
LIMIT 10;

-- ========================================
-- STEP 3: DELETE INVALID ROWS (safer than updating)
-- ========================================

-- Delete invalid rows from user_connections
DELETE FROM user_connections 
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams')
   OR source_type IS NULL 
   OR source_type = '';

-- Delete invalid rows from documents
DELETE FROM documents 
WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams')
   OR source_type IS NULL 
   OR source_type = '';

-- Delete invalid rows from document_chunks (only if the table exists and has source_type column)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' 
        AND column_name = 'source_type'
    ) THEN
        DELETE FROM document_chunks 
        WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'teams')
           OR source_type IS NULL 
           OR source_type = '';
    END IF;
END $$;

-- ========================================
-- STEP 4: NOW ADD THE TEAMS CONSTRAINT
-- ========================================

-- Drop old constraints
ALTER TABLE user_connections 
DROP CONSTRAINT IF EXISTS user_connections_source_type_check;

ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_source_type_check;

-- Drop document_chunks constraint only if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'document_chunks_source_type_check'
    ) THEN
        ALTER TABLE document_chunks DROP CONSTRAINT document_chunks_source_type_check;
    END IF;
END $$;

-- Add new constraints with 'teams'
ALTER TABLE user_connections 
ADD CONSTRAINT user_connections_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

ALTER TABLE documents 
ADD CONSTRAINT documents_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));

-- Add document_chunks constraint only if the table and column exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_chunks' 
        AND column_name = 'source_type'
    ) THEN
        ALTER TABLE document_chunks 
        ADD CONSTRAINT document_chunks_source_type_check 
        CHECK (source_type IN ('slack', 'notion', 'google_drive', 'teams'));
    END IF;
END $$;

-- ========================================
-- STEP 5: ADD MISSING COLUMN
-- ========================================

-- Add token_expires_at column for Teams token expiration
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- ========================================
-- STEP 6: VERIFY SUCCESS
-- ========================================

-- Show final state
SELECT 'Final source_type values after cleanup:' as step;
SELECT source_type, COUNT(*) as count
FROM user_connections 
GROUP BY source_type
ORDER BY source_type;

-- Show constraints
SELECT 'Constraints added successfully!' as step;
SELECT 
  conname, 
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conname LIKE '%source_type_check%'
ORDER BY conrelid::regclass;

SELECT '✅ Teams integration database update complete!' as status;
