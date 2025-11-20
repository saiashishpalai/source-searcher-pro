-- Add 'todoist' to the allowed source_types in the documents table
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Drop the existing constraint
ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_source_type_check;

-- Step 2: Add the new constraint with 'todoist' included
ALTER TABLE documents 
ADD CONSTRAINT documents_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'todoist'));

