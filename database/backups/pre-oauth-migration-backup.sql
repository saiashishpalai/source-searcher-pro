-- ============================================================================
-- DATABASE BACKUP: Pre-OAuth Migration
-- Created: 2025-10-23
-- Purpose: Backup user_connections and profiles before adding OAuth credentials
-- ============================================================================
--
-- INSTRUCTIONS:
-- 1. Run this SQL in your Supabase SQL Editor FIRST before any migration
-- 2. Verify backups created successfully
-- 3. Keep these backup tables for at least 30 days
-- 4. Use rollback script if needed to restore
--
-- ============================================================================

-- Backup user_connections table (complete copy with data)
CREATE TABLE IF NOT EXISTS user_connections_backup_20251023 AS 
SELECT * FROM user_connections;

-- Add comment to document backup
COMMENT ON TABLE user_connections_backup_20251023 IS 
'Backup of user_connections before OAuth credentials migration on 2025-10-23. Includes all columns and data.';

-- Backup profiles table (complete copy with data)
CREATE TABLE IF NOT EXISTS profiles_backup_20251023 AS 
SELECT * FROM profiles;

-- Add comment to document backup
COMMENT ON TABLE profiles_backup_20251023 IS 
'Backup of profiles before OAuth credentials migration on 2025-10-23. Includes all columns and data.';

-- Verify backups were created successfully
DO $$
DECLARE
  connections_count INTEGER;
  profiles_count INTEGER;
  backup_connections_count INTEGER;
  backup_profiles_count INTEGER;
BEGIN
  -- Count original tables
  SELECT COUNT(*) INTO connections_count FROM user_connections;
  SELECT COUNT(*) INTO profiles_count FROM profiles;
  
  -- Count backup tables
  SELECT COUNT(*) INTO backup_connections_count FROM user_connections_backup_20251023;
  SELECT COUNT(*) INTO backup_profiles_count FROM profiles_backup_20251023;
  
  -- Report results
  RAISE NOTICE '=== BACKUP VERIFICATION ===';
  RAISE NOTICE 'Original user_connections: % rows', connections_count;
  RAISE NOTICE 'Backup user_connections: % rows', backup_connections_count;
  RAISE NOTICE 'Original profiles: % rows', profiles_count;
  RAISE NOTICE 'Backup profiles: % rows', backup_profiles_count;
  
  -- Verify counts match
  IF connections_count = backup_connections_count AND profiles_count = backup_profiles_count THEN
    RAISE NOTICE '✓ BACKUP SUCCESSFUL - All data copied correctly';
  ELSE
    RAISE EXCEPTION '✗ BACKUP FAILED - Row counts do not match!';
  END IF;
END $$;

-- Create a backup metadata table to track backups
CREATE TABLE IF NOT EXISTS backup_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_name TEXT NOT NULL,
  backup_date TIMESTAMPTZ DEFAULT NOW(),
  table_name TEXT NOT NULL,
  row_count INTEGER,
  notes TEXT
);

-- Record this backup
INSERT INTO backup_metadata (backup_name, table_name, row_count, notes)
SELECT 
  'pre-oauth-migration-20251023',
  'user_connections',
  COUNT(*),
  'Pre-OAuth credentials migration backup'
FROM user_connections;

INSERT INTO backup_metadata (backup_name, table_name, row_count, notes)
SELECT 
  'pre-oauth-migration-20251023',
  'profiles',
  COUNT(*),
  'Pre-OAuth credentials migration backup'
FROM profiles;

-- Display backup summary
SELECT 
  backup_name,
  table_name,
  row_count,
  backup_date,
  notes
FROM backup_metadata
WHERE backup_name = 'pre-oauth-migration-20251023'
ORDER BY table_name;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== BACKUP COMPLETE ===';
  RAISE NOTICE 'Backup tables created:';
  RAISE NOTICE '  - user_connections_backup_20251023';
  RAISE NOTICE '  - profiles_backup_20251023';
  RAISE NOTICE '';
  RAISE NOTICE 'To restore from backup, run: database/backups/rollback-oauth-migration.sql';
END $$;

