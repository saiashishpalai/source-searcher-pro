-- Add missing columns to user_connections table
-- The backend code expects these columns but they don't exist

-- Add token_expires_at column
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Add any other missing columns that the backend might expect
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Update the comment
COMMENT ON COLUMN user_connections.token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN user_connections.expires_at IS 'When the access token expires (alternative column name)';

-- Verify the columns were added
SELECT 
  'user_connections columns updated successfully' as status,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'user_connections' 
AND column_name IN ('token_expires_at', 'expires_at')
ORDER BY column_name;
