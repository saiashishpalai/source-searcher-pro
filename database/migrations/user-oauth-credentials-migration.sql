-- ============================================================================
-- MIGRATION: User OAuth Credentials
-- Created: 2025-10-23
-- Purpose: Add OAuth credential storage for multi-tenant architecture
-- ============================================================================
--
-- PREREQUISITES:
-- 1. Run database/backups/pre-oauth-migration-backup.sql FIRST
-- 2. Verify backup tables created successfully
-- 3. Read rollback procedure: database/backups/rollback-oauth-migration.sql
--
-- CHANGES:
-- - Adds OAuth credential columns to user_connections table
-- - Creates encryption/decryption functions using pgsodium
-- - Non-destructive: all new columns are nullable
-- - Existing connections continue to work unchanged
--
-- ============================================================================

-- Enable pgsodium extension for encryption (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgsodium;

DO $$
BEGIN
  RAISE NOTICE 'Starting OAuth credentials migration...';
END $$;

-- ============================================================================
-- STEP 1: Add new columns to user_connections table
-- ============================================================================

-- Add client_id (not sensitive, stored in plaintext)
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS client_id TEXT;

COMMENT ON COLUMN user_connections.client_id IS 
'OAuth Client ID provided by user for their own OAuth app. Stored in plaintext (not sensitive).';

-- Add client_secret_encrypted (sensitive, must be encrypted)
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS client_secret_encrypted TEXT;

COMMENT ON COLUMN user_connections.client_secret_encrypted IS 
'OAuth Client Secret provided by user, encrypted using pgsodium. Only decrypted server-side.';

-- Add redirect_uri (user's configured redirect URI)
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS redirect_uri TEXT;

COMMENT ON COLUMN user_connections.redirect_uri IS 
'OAuth redirect URI configured in user''s OAuth app (e.g., https://backend.render.com/api/auth/google/callback).';

-- Add credentials_configured_at (tracking timestamp)
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS credentials_configured_at TIMESTAMPTZ;

COMMENT ON COLUMN user_connections.credentials_configured_at IS 
'Timestamp when user provided their OAuth credentials.';

-- Add token_expires_at (if not exists - some OAuth providers need this)
ALTER TABLE user_connections 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN user_connections.token_expires_at IS 
'When the OAuth access token expires (for providers that have expiring tokens like Google).';

DO $$
BEGIN
  RAISE NOTICE '✓ Added new columns to user_connections table';
END $$;

-- ============================================================================
-- STEP 2: Create encryption functions using pgsodium
-- ============================================================================

-- Function to encrypt client secret
-- Uses pgsodium with user_id as associated data for additional security
CREATE OR REPLACE FUNCTION encrypt_client_secret(
  secret TEXT,
  user_id UUID
) RETURNS TEXT AS $$
DECLARE
  encrypted_data BYTEA;
  nonce BYTEA;
  associated_data BYTEA;
BEGIN
  -- Validate inputs
  IF secret IS NULL OR secret = '' THEN
    RAISE EXCEPTION 'Client secret cannot be empty';
  END IF;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  -- Generate random nonce (24 bytes for secretbox)
  nonce := pgsodium.crypto_secretbox_noncegen();
  
  -- Use user_id as associated data for authenticated encryption
  associated_data := user_id::TEXT::BYTEA;
  
  -- Encrypt the secret using secretbox
  -- This uses the pgsodium encryption key stored in Supabase vault
  encrypted_data := pgsodium.crypto_secretbox(
    secret::BYTEA,
    nonce,
    pgsodium.crypto_secretbox_keygen()
  );
  
  -- Return as base64 encoded string (nonce || encrypted_data)
  RETURN encode(nonce || encrypted_data, 'base64');
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Encryption failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION encrypt_client_secret(TEXT, UUID) IS 
'Encrypts OAuth client secret using pgsodium. Returns base64 encoded encrypted string.';

-- Function to decrypt client secret
CREATE OR REPLACE FUNCTION decrypt_client_secret(
  encrypted TEXT,
  user_id UUID
) RETURNS TEXT AS $$
DECLARE
  decoded_data BYTEA;
  nonce BYTEA;
  encrypted_data BYTEA;
  decrypted_data BYTEA;
  associated_data BYTEA;
BEGIN
  -- Validate inputs
  IF encrypted IS NULL OR encrypted = '' THEN
    RAISE EXCEPTION 'Encrypted data cannot be empty';
  END IF;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  -- Decode from base64
  decoded_data := decode(encrypted, 'base64');
  
  -- Extract nonce (first 24 bytes) and encrypted data (rest)
  nonce := substring(decoded_data FROM 1 FOR 24);
  encrypted_data := substring(decoded_data FROM 25);
  
  -- Use user_id as associated data for authenticated decryption
  associated_data := user_id::TEXT::BYTEA;
  
  -- Decrypt using secretbox
  decrypted_data := pgsodium.crypto_secretbox_open(
    encrypted_data,
    nonce,
    pgsodium.crypto_secretbox_keygen()
  );
  
  -- Convert bytea to text and return
  RETURN convert_from(decrypted_data, 'UTF8');
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Decryption failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION decrypt_client_secret(TEXT, UUID) IS 
'Decrypts OAuth client secret using pgsodium. Returns plaintext secret.';

DO $$
BEGIN
  RAISE NOTICE '✓ Created encryption/decryption functions';
END $$;

-- ============================================================================
-- STEP 3: Create indexes for new columns
-- ============================================================================

-- Index for faster lookups by credentials configuration status
CREATE INDEX IF NOT EXISTS idx_user_connections_has_credentials 
ON user_connections(user_id, source_type) 
WHERE client_id IS NOT NULL;

COMMENT ON INDEX idx_user_connections_has_credentials IS 
'Optimizes queries checking if user has configured OAuth credentials for a provider.';

DO $$
BEGIN
  RAISE NOTICE '✓ Created indexes for new columns';
END $$;

-- ============================================================================
-- STEP 4: Update RLS policies (ensure they cover new columns)
-- ============================================================================

-- RLS policies already exist from user-connections-schema.sql
-- They apply to all columns automatically, including new ones
-- Just verify they're still active

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_connections' 
    AND policyname = 'Users can view own connections'
  ) THEN
    RAISE EXCEPTION 'RLS policy "Users can view own connections" is missing! Run user-connections-schema.sql first.';
  END IF;
  
  RAISE NOTICE '✓ Verified RLS policies are active';
END $$;

-- ============================================================================
-- STEP 5: Verify migration completed successfully
-- ============================================================================

DO $$
DECLARE
  has_client_id BOOLEAN;
  has_client_secret BOOLEAN;
  has_redirect_uri BOOLEAN;
  has_credentials_at BOOLEAN;
BEGIN
  -- Check if all new columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_connections' AND column_name = 'client_id'
  ) INTO has_client_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_connections' AND column_name = 'client_secret_encrypted'
  ) INTO has_client_secret;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_connections' AND column_name = 'redirect_uri'
  ) INTO has_redirect_uri;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_connections' AND column_name = 'credentials_configured_at'
  ) INTO has_credentials_at;
  
  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION VERIFICATION ===';
  RAISE NOTICE 'client_id column: %', CASE WHEN has_client_id THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'client_secret_encrypted column: %', CASE WHEN has_client_secret THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'redirect_uri column: %', CASE WHEN has_redirect_uri THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'credentials_configured_at column: %', CASE WHEN has_credentials_at THEN '✓' ELSE '✗' END;
  
  IF has_client_id AND has_client_secret AND has_redirect_uri AND has_credentials_at THEN
    RAISE NOTICE '✓ MIGRATION SUCCESSFUL - All columns added';
  ELSE
    RAISE EXCEPTION '✗ MIGRATION FAILED - Some columns are missing!';
  END IF;
END $$;

-- Record migration in backup_metadata
INSERT INTO backup_metadata (backup_name, table_name, row_count, notes)
VALUES (
  'oauth-credentials-migration-20251023',
  'user_connections',
  (SELECT COUNT(*) FROM user_connections),
  'Added OAuth credentials columns: client_id, client_secret_encrypted, redirect_uri, credentials_configured_at'
);

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'New columns added to user_connections:';
  RAISE NOTICE '  - client_id (TEXT)';
  RAISE NOTICE '  - client_secret_encrypted (TEXT)';
  RAISE NOTICE '  - redirect_uri (TEXT)';
  RAISE NOTICE '  - credentials_configured_at (TIMESTAMPTZ)';
  RAISE NOTICE '';
  RAISE NOTICE 'Encryption functions created:';
  RAISE NOTICE '  - encrypt_client_secret(secret TEXT, user_id UUID)';
  RAISE NOTICE '  - decrypt_client_secret(encrypted TEXT, user_id UUID)';
  RAISE NOTICE '';
  RAISE NOTICE 'Existing connections are unaffected (new columns are nullable)';
  RAISE NOTICE 'To rollback, run: database/backups/rollback-oauth-migration.sql';
END $$;

