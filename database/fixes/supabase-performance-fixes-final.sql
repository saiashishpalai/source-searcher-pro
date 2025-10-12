-- Supabase Performance Optimization Fixes - FINAL VERSION
-- This script will force-drop all policies and recreate them with proper optimization

-- ==============================================
-- STEP 1: Check current policies first
-- ==============================================

-- Let's see what policies currently exist
SELECT 
    'Current Policies Check' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==============================================
-- STEP 2: Force drop ALL policies (including system ones)
-- ==============================================

-- Drop all policies on profiles table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON profiles';
    END LOOP;
END $$;

-- Drop all policies on user_connections table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_connections'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON user_connections';
    END LOOP;
END $$;

-- Drop all policies on user_connections_backup table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_connections_backup'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON user_connections_backup';
    END LOOP;
END $$;

-- Drop all policies on search_queries table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'search_queries'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON search_queries';
    END LOOP;
END $$;

-- Drop all policies on integrations table (if exists)
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations' AND table_schema = 'public') THEN
        FOR pol IN 
            SELECT policyname FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = 'integrations'
        LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON integrations';
        END LOOP;
    END IF;
END $$;

-- ==============================================
-- STEP 3: Create NEW optimized policies
-- ==============================================

-- PROFILES TABLE - Create optimized policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- USER_CONNECTIONS TABLE - Create optimized policies
CREATE POLICY "Users can manage own connections" ON user_connections
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role can manage all connections" ON user_connections
  FOR ALL USING (current_setting('role') = 'service_role');

-- USER_CONNECTIONS_BACKUP TABLE - Create optimized policies
CREATE POLICY "Users can manage own backup connections" ON user_connections_backup
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role can manage all backup connections" ON user_connections_backup
  FOR ALL USING (current_setting('role') = 'service_role');

-- SEARCH_QUERIES TABLE - Create optimized policies
CREATE POLICY "Users can view own queries" ON search_queries
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own queries" ON search_queries
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- INTEGRATIONS TABLE - Create optimized policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations' AND table_schema = 'public') THEN
        EXECUTE 'CREATE POLICY "Users can manage own integrations" ON integrations FOR ALL USING ((SELECT auth.uid()) = user_id)';
    END IF;
END $$;

-- ==============================================
-- STEP 4: Verify the new policies
-- ==============================================

-- Check that new policies are created and optimized
SELECT 
    'New Policies Check' as check_type,
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%(SELECT auth.uid())%' THEN '✅ Optimized'
        WHEN qual LIKE '%auth.uid()%' THEN '❌ Still using auth.uid()'
        ELSE 'ℹ️ No auth.uid() usage'
    END as optimization_status,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==============================================
-- STEP 5: Test the optimization function
-- ==============================================

-- Create/update the performance monitoring function
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
-- STEP 6: Final verification
-- ==============================================

-- Run the performance check
SELECT 'Final Performance Check:' as status;
SELECT * FROM check_rls_performance();

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

SELECT '🎉 Performance optimization completed!' as status;
SELECT 'All policies should now show is_optimized: true' as result;
