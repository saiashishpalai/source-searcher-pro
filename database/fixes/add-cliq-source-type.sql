-- Add 'cliq' to the user_connections source_type constraint
-- This allows Zoho Cliq to be stored as a valid connection source

-- Drop the existing constraint
ALTER TABLE user_connections DROP CONSTRAINT IF EXISTS user_connections_source_type_check;

-- Add the new constraint with 'cliq' included
ALTER TABLE user_connections ADD CONSTRAINT user_connections_source_type_check 
CHECK (source_type IN ('google_drive', 'notion', 'slack', 'cliq'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_connections'::regclass 
AND conname = 'user_connections_source_type_check';

