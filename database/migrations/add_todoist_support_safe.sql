-- Safe migration to add 'todoist' to allowed source_types
-- This handles existing data that might violate the constraint

-- Step 1: Check what source_types currently exist (for reference)
-- SELECT DISTINCT source_type FROM user_connections;

-- Step 2: Update any invalid source_types if needed (optional, only if you have invalid data)
-- UPDATE user_connections 
-- SET source_type = 'slack' 
-- WHERE source_type NOT IN ('slack', 'notion', 'google_drive', 'todoist');

-- Step 3: Drop the old constraint
ALTER TABLE user_connections 
DROP CONSTRAINT IF EXISTS user_connections_source_type_check;

-- Step 4: Add the new constraint with 'todoist' included
ALTER TABLE user_connections 
ADD CONSTRAINT user_connections_source_type_check 
CHECK (source_type IN ('slack', 'notion', 'google_drive', 'todoist'));

