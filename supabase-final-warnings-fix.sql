-- Supabase Final Warnings Fix
-- Fix the remaining 2 security warnings

-- ==============================================
-- FIX 1: Function Search Path Security
-- ==============================================

-- Fix the check_rls_performance function with secure search_path
CREATE OR REPLACE FUNCTION check_rls_performance()
RETURNS TABLE(
    table_name text,
    policy_name text,
    is_optimized boolean,
    recommendation text
) 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$ LANGUAGE plpgsql;

-- ==============================================
-- FIX 2: Verify Function Security
-- ==============================================

-- Check that the function now has proper security settings
SELECT 
    'Function Security Check' as check_type,
    proname as function_name,
    prosecdef as security_definer,
    proconfig as search_path_config,
    CASE 
        WHEN prosecdef AND 'search_path=public' = ANY(proconfig) THEN '✅ Secure'
        WHEN prosecdef THEN '⚠️ SECURITY DEFINER but no search_path'
        ELSE '❌ Not SECURITY DEFINER'
    END as security_status
FROM pg_proc 
WHERE proname = 'check_rls_performance'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ==============================================
-- FIX 3: Additional Security Enhancements
-- ==============================================

-- Ensure all other functions also have proper security settings
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
-- VERIFICATION
-- ==============================================

-- Check all functions have proper security settings
SELECT 
    'All Functions Security Check' as check_type,
    proname as function_name,
    prosecdef as security_definer,
    CASE 
        WHEN prosecdef THEN '✅ SECURITY DEFINER'
        ELSE '❌ Not SECURITY DEFINER'
    END as status
FROM pg_proc 
WHERE proname IN ('check_rls_performance', 'update_updated_at_column', 'handle_new_user')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

SELECT '🎉 Function security warnings fixed!' as status;
SELECT 'Note: Leaked password protection must be enabled in Supabase Dashboard' as next_step;
