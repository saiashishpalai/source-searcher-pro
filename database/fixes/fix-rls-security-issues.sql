-- Fix RLS Security Issues
-- Run this SQL in Supabase SQL Editor to fix all RLS disabled warnings
-- 
-- This migration enables RLS and creates restrictive policies for backup tables
-- and other tables that should only be accessible by service_role

-- ==============================================
-- FIX 1: documents_backup_20251030_060554
-- ==============================================

ALTER TABLE public.documents_backup_20251030_060554 ENABLE ROW LEVEL SECURITY;

-- Only allow service_role access to backup data
DROP POLICY IF EXISTS "Service role only access" ON public.documents_backup_20251030_060554;
CREATE POLICY "Service role only access"
  ON public.documents_backup_20251030_060554
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX 2: backup_metadata
-- ==============================================

ALTER TABLE public.backup_metadata ENABLE ROW LEVEL SECURITY;

-- Only allow service_role access to backup metadata
DROP POLICY IF EXISTS "Service role only access" ON public.backup_metadata;
CREATE POLICY "Service role only access"
  ON public.backup_metadata
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX 3: user_connections_backup_20251023
-- ==============================================

ALTER TABLE public.user_connections_backup_20251023 ENABLE ROW LEVEL SECURITY;

-- Only allow service_role access
DROP POLICY IF EXISTS "Service role only access" ON public.user_connections_backup_20251023;
CREATE POLICY "Service role only access"
  ON public.user_connections_backup_20251023
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX 4: profiles_backup_20251023
-- ==============================================

ALTER TABLE public.profiles_backup_20251023 ENABLE ROW LEVEL SECURITY;

-- Only allow service_role access
DROP POLICY IF EXISTS "Service role only access" ON public.profiles_backup_20251023;
CREATE POLICY "Service role only access"
  ON public.profiles_backup_20251023
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX 5: document_chunks_backup_20251030_060554
-- ==============================================

ALTER TABLE public.document_chunks_backup_20251030_060554 ENABLE ROW LEVEL SECURITY;

-- Only allow service_role access
DROP POLICY IF EXISTS "Service role only access" ON public.document_chunks_backup_20251030_060554;
CREATE POLICY "Service role only access"
  ON public.document_chunks_backup_20251030_060554
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX 6: user_connections_backup_20251030_060554
-- ==============================================

ALTER TABLE public.user_connections_backup_20251030_060554 ENABLE ROW LEVEL SECURITY;

-- Only allow service_role access
DROP POLICY IF EXISTS "Service role only access" ON public.user_connections_backup_20251030_060554;
CREATE POLICY "Service role only access"
  ON public.user_connections_backup_20251030_060554
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX 7: search_history_backup_20251030_060554
-- ==============================================

ALTER TABLE public.search_history_backup_20251030_060554 ENABLE ROW LEVEL SECURITY;

-- Only allow service_role access
DROP POLICY IF EXISTS "Service role only access" ON public.search_history_backup_20251030_060554;
CREATE POLICY "Service role only access"
  ON public.search_history_backup_20251030_060554
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX 8: action_executions
-- ==============================================

ALTER TABLE public.action_executions ENABLE ROW LEVEL SECURITY;

-- Only allow service_role access (table appears unused, restricting to service_role only)
DROP POLICY IF EXISTS "Service role only access" ON public.action_executions;
CREATE POLICY "Service role only access"
  ON public.action_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Check that RLS is enabled on all affected tables
SELECT 
    'RLS Status' as check_type,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'documents_backup_20251030_060554',
    'backup_metadata',
    'user_connections_backup_20251023',
    'profiles_backup_20251023',
    'document_chunks_backup_20251030_060554',
    'user_connections_backup_20251030_060554',
    'search_history_backup_20251030_060554',
    'action_executions'
)
ORDER BY tablename;

-- Check policies were created
SELECT 
    'Policy Status' as check_type,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'documents_backup_20251030_060554',
    'backup_metadata',
    'user_connections_backup_20251023',
    'profiles_backup_20251023',
    'document_chunks_backup_20251030_060554',
    'user_connections_backup_20251030_060554',
    'search_history_backup_20251030_060554',
    'action_executions'
)
ORDER BY tablename, policyname;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

SELECT '🎉 All 8 RLS security issues have been fixed!' as status;
SELECT 'Refresh the Security Advisor in Supabase Dashboard to verify the fixes.' as next_step;

-- ==============================================
-- OPTIONAL: CLEANUP OLD BACKUP TABLES
-- ==============================================
-- If you no longer need these backup tables, you can drop them instead of securing them.
-- Uncomment the lines below to remove old backup tables (use with caution!):
--
-- DROP TABLE IF EXISTS public.documents_backup_20251030_060554 CASCADE;
-- DROP TABLE IF EXISTS public.user_connections_backup_20251023 CASCADE;
-- DROP TABLE IF EXISTS public.profiles_backup_20251023 CASCADE;
-- DROP TABLE IF EXISTS public.document_chunks_backup_20251030_060554 CASCADE;
-- DROP TABLE IF EXISTS public.user_connections_backup_20251030_060554 CASCADE;
-- DROP TABLE IF EXISTS public.search_history_backup_20251030_060554 CASCADE;
-- DROP TABLE IF EXISTS public.backup_metadata CASCADE;
-- DROP TABLE IF EXISTS public.action_executions CASCADE;
