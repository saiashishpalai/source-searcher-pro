-- ============================================================================
-- ROLLBACK SCRIPT: OAuth Migration Rollback
-- Created: 2025-10-23
-- Purpose: Restore database to pre-OAuth migration state if needed
-- ============================================================================
--
-- INSTRUCTIONS:
-- 1. Only run this if something goes wrong with the migration
-- 2. This will restore data from backup tables created on 2025-10-23
-- 3. Verify backup tables exist before running
--
-- ============================================================================

-- Verify backup tables exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE tablename = 'user_connections_backup_20251023'
  ) THEN
    RAISE EXCEPTION 'Backup table user_connections_backup_20251023 does not exist! Cannot rollback.';
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE tablename = 'profiles_backup_20251023'
  ) THEN
    RAISE EXCEPTION 'Backup table profiles_backup_20251023 does not exist! Cannot rollback.';
  END IF;
  
  RAISE NOTICE '✓ Backup tables verified';
END $$;

-- Step 1: Drop new columns added by migration (if they exist)
ALTER TABLE user_connections DROP COLUMN IF EXISTS client_id;
ALTER TABLE user_connections DROP COLUMN IF EXISTS client_secret_encrypted;
ALTER TABLE user_connections DROP COLUMN IF EXISTS redirect_uri;
ALTER TABLE user_connections DROP COLUMN IF EXISTS credentials_configured_at;
ALTER TABLE user_connections DROP COLUMN IF EXISTS token_expires_at;

-- Step 2: Restore user_connections data from backup
TRUNCATE TABLE user_connections CASCADE;

-- Insert only the columns that exist in both tables
INSERT INTO user_connections (
  id, user_id, source_type, source_user_id, access_token, 
  refresh_token, is_active, metadata, created_at, updated_at, last_synced_at
)
SELECT 
  id, user_id, source_type, source_user_id, access_token, 
  refresh_token, is_active, metadata, created_at, updated_at, last_synced_at
FROM user_connections_backup_20251023;

-- Step 3: Restore profiles data from backup (if needed)
TRUNCATE TABLE profiles CASCADE;

INSERT INTO profiles 
SELECT * FROM profiles_backup_20251023;

-- Step 4: Drop encryption functions if they exist
DROP FUNCTION IF EXISTS encrypt_client_secret(TEXT, UUID);
DROP FUNCTION IF EXISTS decrypt_client_secret(TEXT, UUID);

-- Verify restoration
DO $$
DECLARE
  original_count INTEGER;
  restored_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO original_count FROM user_connections_backup_20251023;
  SELECT COUNT(*) INTO restored_count FROM user_connections;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== ROLLBACK VERIFICATION ===';
  RAISE NOTICE 'Original backup: % rows', original_count;
  RAISE NOTICE 'Restored table: % rows', restored_count;
  
  IF original_count = restored_count THEN
    RAISE NOTICE '✓ ROLLBACK SUCCESSFUL - All data restored';
  ELSE
    RAISE EXCEPTION '✗ ROLLBACK FAILED - Row counts do not match!';
  END IF;
END $$;

-- Record rollback in metadata
INSERT INTO backup_metadata (backup_name, table_name, row_count, notes)
VALUES (
  'rollback-oauth-migration-20251023',
  'user_connections',
  (SELECT COUNT(*) FROM user_connections),
  'Rolled back OAuth credentials migration'
);

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ROLLBACK COMPLETE ===';
  RAISE NOTICE 'Database restored to pre-migration state';
  RAISE NOTICE 'Backup tables preserved for future reference';
END $$;

