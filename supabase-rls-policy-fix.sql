-- SUPABASE RLS POLICY FIX
-- Run this SQL in Supabase SQL Editor to fix all RLS policy warnings

-- ==============================================
-- FIX 1: Fix user_connections table
-- ==============================================

-- Remove the problematic policy that causes conflicts
DROP POLICY IF EXISTS "Service role can manage all connections" ON public.user_connections;

-- Create proper service role policy (role-specific, no conflicts)
CREATE POLICY "Service role full access"
  ON public.user_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX 2: Fix user_connections_backup table
-- ==============================================

-- Remove the problematic policy that causes conflicts
DROP POLICY IF EXISTS "Service role can manage all backup connections" ON public.user_connections_backup;

-- Create proper service role policy (role-specific, no conflicts)
CREATE POLICY "Service role full access backup"
  ON public.user_connections_backup
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX 3: Optimize user policies (if needed)
-- ==============================================

-- Ensure user policies are optimized
DROP POLICY IF EXISTS "Users can manage own connections" ON public.user_connections;
CREATE POLICY "Users can manage own connections" ON public.user_connections
  FOR ALL
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage own backup connections" ON public.user_connections_backup;
CREATE POLICY "Users can manage own backup connections" ON public.user_connections_backup
  FOR ALL
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================
-- FIX 4: Alternative - Delete backup table (if not needed)
-- ==============================================

-- Uncomment the line below if you don't need the backup table
-- DROP TABLE IF EXISTS public.user_connections_backup CASCADE;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Check policy count per table
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
AND tablename IN ('user_connections', 'user_connections_backup')
GROUP BY tablename
ORDER BY tablename;

-- Check for role-specific policies
SELECT 
    'Role-Specific Policy Check' as check_type,
    tablename,
    policyname,
    roles,
    CASE 
        WHEN 'service_role' = ANY(roles) THEN '✅ Service role policy'
        ELSE 'ℹ️ User policy'
    END as policy_type
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('user_connections', 'user_connections_backup')
ORDER BY tablename, policyname;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

SELECT '🎉 RLS Policy warnings should now be fixed!' as status;
SELECT 'Refresh Database Advisors in Supabase Dashboard to verify' as next_step;
