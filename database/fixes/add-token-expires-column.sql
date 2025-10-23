-- Add the missing token_expires_at column to user_connections table
-- This is the column that the backend code expects but doesn't exist

-- First, check if the column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_connections' 
        AND column_name = 'token_expires_at'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE user_connections 
        ADD COLUMN token_expires_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added token_expires_at column to user_connections table';
    ELSE
        RAISE NOTICE 'token_expires_at column already exists in user_connections table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    'Column check completed' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_connections' 
AND column_name = 'token_expires_at';

-- Test inserting a record with the new column
INSERT INTO user_connections (
    user_id, 
    source_type, 
    source_user_id, 
    access_token, 
    token_expires_at,
    is_active
) VALUES (
    'b7a5b22c-34f5-446a-8627-112f70ba11b2',
    'teams',
    'test-user-' || extract(epoch from now()),
    'test-token-' || extract(epoch from now()),
    NOW() + INTERVAL '1 hour',
    true
) ON CONFLICT (user_id, source_type) DO UPDATE SET
    access_token = EXCLUDED.access_token,
    token_expires_at = EXCLUDED.token_expires_at,
    updated_at = NOW();

-- Final verification
SELECT 
    'Test insert completed successfully' as status,
    COUNT(*) as total_connections
FROM user_connections;
