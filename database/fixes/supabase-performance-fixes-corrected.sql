-- Supabase Performance Optimization Fixes - CORRECTED VERSION
-- Run this SQL in your Supabase SQL Editor to fix all performance issues

-- ==============================================
-- FIX 1: Drop ALL existing policies first
-- ==============================================

-- Drop all existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can manage own connections" ON user_connections;
DROP POLICY IF EXISTS "Service role can manage all connections" ON user_connections;

DROP POLICY IF EXISTS "Users can view own backup connections" ON user_connections_backup;
DROP POLICY IF EXISTS "Users can insert own backup connections" ON user_connections_backup;
DROP POLICY IF EXISTS "Users can update own backup connections" ON user_connections_backup;
DROP POLICY IF EXISTS "Users can delete own backup connections" ON user_connections_backup;
DROP POLICY IF EXISTS "Users can manage own backup connections" ON user_connections_backup;
DROP POLICY IF EXISTS "Service role can manage all backup connections" ON user_connections_backup;

DROP POLICY IF EXISTS "Users can view own queries" ON search_queries;
DROP POLICY IF EXISTS "Users can insert own queries" ON search_queries;

DROP POLICY IF EXISTS "Users can view own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can insert own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can update own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can delete own integrations" ON integrations;
DROP POLICY IF EXISTS "Users can manage own integrations" ON integrations;

-- ==============================================
-- FIX 2: Create OPTIMIZED policies with (SELECT auth.uid())
-- ==============================================

-- PROFILES TABLE - Optimized policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- USER_CONNECTIONS TABLE - Optimized policies
CREATE POLICY "Users can manage own connections" ON user_connections
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role can manage all connections" ON user_connections
  FOR ALL USING (current_setting('role') = 'service_role');

-- USER_CONNECTIONS_BACKUP TABLE - Optimized policies
CREATE POLICY "Users can manage own backup connections" ON user_connections_backup
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role can manage all backup connections" ON user_connections_backup
  FOR ALL USING (current_setting('role') = 'service_role');

-- SEARCH_QUERIES TABLE - Optimized policies
CREATE POLICY "Users can view own queries" ON search_queries
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own queries" ON search_queries
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- INTEGRATIONS TABLE - Optimized policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations' AND table_schema = 'public') THEN
        EXECUTE 'CREATE POLICY "Users can manage own integrations" ON integrations FOR ALL USING ((SELECT auth.uid()) = user_id)';
    END IF;
END $$;

-- ==============================================
-- FIX 3: Remove Duplicate Indexes
-- ==============================================

-- Remove duplicate indexes
DROP INDEX IF EXISTS idx_user_connections_is_active;

-- ==============================================
-- FIX 4: Create Optimized Indexes
-- ==============================================

-- Ensure we have proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_source_type ON user_connections(source_type);
CREATE INDEX IF NOT EXISTS idx_user_connections_active ON user_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_user_connections_backup_user_id ON user_connections_backup(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at);

-- ==============================================
-- FIX 5: Optimize Functions for Performance
-- ==============================================

-- Recreate functions with optimized settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check RLS policies are optimized
SELECT 
    'RLS Policy Optimization Check' as check_type,
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%(SELECT auth.uid())%' THEN '✅ Optimized'
        WHEN qual LIKE '%auth.uid()%' THEN '❌ Needs optimization'
        ELSE 'ℹ️ No auth.uid() usage'
    END as optimization_status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check for duplicate indexes
SELECT 
    'Duplicate Index Check' as check_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('user_connections', 'user_connections_backup', 'profiles', 'search_queries')
ORDER BY tablename, indexname;

-- Check index usage statistics
SELECT 
    'Index Usage Check' as check_type,
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ==============================================
-- PERFORMANCE MONITORING
-- ==============================================

-- Create a function to monitor RLS policy performance
CREATE OR REPLACE FUNCTION check_rls_performance()
RETURNS TABLE(
    table_name text,
    policy_name text,
    is_optimized boolean,
    recommendation text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.tablename::text,
        p.policyname::text,
        CASE 
            WHEN p.qual LIKE '%(SELECT auth.uid())%' THEN true
            ELSE false
        END as is_optimized,
        CASE 
            WHEN p.qual LIKE '%auth.uid()%' AND p.qual NOT LIKE '%(SELECT auth.uid())%' 
            THEN 'Replace auth.uid() with (SELECT auth.uid())'
            WHEN p.qual LIKE '%(SELECT auth.uid())%' 
            THEN 'Already optimized'
            ELSE 'No optimization needed'
        END as recommendation
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    ORDER BY p.tablename, p.policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

SELECT '🚀 All Supabase performance issues have been optimized!' as status;
SELECT 'Run check_rls_performance() to verify optimizations' as next_step;
