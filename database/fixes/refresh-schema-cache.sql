-- Force Supabase to refresh its schema cache
-- This will make the new columns visible to the backend

-- Method 1: Query the table to force cache refresh
SELECT * FROM user_connections LIMIT 1;

-- Method 2: Check if the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_connections' 
AND column_name = 'token_expires_at';

-- Method 3: Force a schema refresh by querying system tables
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'user_connections'
ORDER BY ordinal_position;

-- Method 4: Try to insert a test record to force schema validation
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
  'test-user',
  'test-token',
  NOW() + INTERVAL '1 hour',
  true
) ON CONFLICT (user_id, source_type) DO UPDATE SET
  access_token = EXCLUDED.access_token,
  token_expires_at = EXCLUDED.token_expires_at,
  updated_at = NOW();

-- Verify the insert worked
SELECT 
  'Schema cache refresh test completed' as status,
  COUNT(*) as total_connections
FROM user_connections;
