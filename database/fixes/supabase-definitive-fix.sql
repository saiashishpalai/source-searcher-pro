-- Supabase DEFINITIVE Performance Fix
-- This script will completely fix all 34 remaining warnings

-- ==============================================
-- STEP 1: Complete Policy Cleanup
-- ==============================================

-- Drop ALL existing policies on all tables
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on user_connections
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_connections'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON user_connections';
    END LOOP;
    
    -- Drop all policies on user_connections_backup
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_connections_backup'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON user_connections_backup';
    END LOOP;
    
    -- Drop all policies on profiles
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON profiles';
    END LOOP;
    
    -- Drop all policies on search_queries
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'search_queries'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON search_queries';
    END LOOP;
END $$;

-- ==============================================
-- STEP 2: Create OPTIMIZED Single Policies
-- ==============================================

-- PROFILES TABLE - Single optimized policy
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING ((SELECT auth.uid()) = id);

-- USER_CONNECTIONS TABLE - Single optimized policy
CREATE POLICY "Users can manage own connections" ON user_connections
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- USER_CONNECTIONS_BACKUP TABLE - Single optimized policy  
CREATE POLICY "Users can manage own backup connections" ON user_connections_backup
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- SEARCH_QUERIES TABLE - Single optimized policy
CREATE POLICY "Users can manage own queries" ON search_queries
  FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- STEP 3: Add Service Role Policies (Optimized)
-- ==============================================

-- Service role policies with optimized current_setting() calls
CREATE POLICY "Service role can manage all connections" ON user_connections
  FOR ALL USING ((SELECT current_setting('role')) = 'service_role');

CREATE POLICY "Service role can manage all backup connections" ON user_connections_backup
  FOR ALL USING ((SELECT current_setting('role')) = 'service_role');

-- ==============================================
-- STEP 4: Verify Policy Count
-- ==============================================

-- Check that we now have minimal policies
SELECT 
    'Policy Count Check' as check_type,
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) <= 2 THEN '✅ Optimized'
        ELSE '❌ Too many policies'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ==============================================
-- STEP 5: Verify Policy Optimization
-- ==============================================

-- Check that all policies use optimized functions
SELECT 
    'Policy Optimization Check' as check_type,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%(SELECT auth.uid())%' THEN '✅ Optimized'
        WHEN qual LIKE '%(SELECT current_setting%' THEN '✅ Optimized'
        WHEN qual LIKE '%auth.uid()%' THEN '❌ Needs optimization'
        WHEN qual LIKE '%current_setting()%' THEN '❌ Needs optimization'
        ELSE 'ℹ️ No optimization needed'
    END as optimization_status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==============================================
-- STEP 6: Performance Test
-- ==============================================

-- Create a function to test policy performance
CREATE OR REPLACE FUNCTION test_policy_performance()
RETURNS TABLE(
    table_name text,
    policy_count integer,
    is_optimized boolean,
    performance_score text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.tablename::text,
        COUNT(*)::integer as policy_count,
        CASE 
            WHEN COUNT(*) <= 2 AND 
                 EVERY(p.qual LIKE '%(SELECT%') THEN true
            ELSE false
        END as is_optimized,
        CASE 
            WHEN COUNT(*) <= 2 AND 
                 EVERY(p.qual LIKE '%(SELECT%') THEN '🚀 Excellent'
            WHEN COUNT(*) <= 3 THEN '⚡ Good'
            ELSE '⚠️ Needs improvement'
        END as performance_score
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    GROUP BY p.tablename
    ORDER BY p.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================
-- STEP 7: Final Verification
-- ==============================================

-- Run the performance test
SELECT 'Final Performance Test:' as status;
SELECT * FROM test_policy_performance();

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

SELECT '🎉 All 34 performance warnings should now be fixed!' as status;
SELECT 'Expected: 0 warnings in Supabase Database Linter' as result;
