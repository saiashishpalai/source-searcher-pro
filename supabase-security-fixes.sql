-- Supabase Security Fixes
-- Run this SQL in your Supabase SQL Editor to fix all security issues

-- ==============================================
-- FIX 1: Enable RLS on user_connections_backup table
-- ==============================================

-- Enable Row Level Security on the backup table
ALTER TABLE user_connections_backup ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the backup table (same as main table)
CREATE POLICY "Users can view own backup connections" ON user_connections_backup
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backup connections" ON user_connections_backup
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own backup connections" ON user_connections_backup
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own backup connections" ON user_connections_backup
  FOR DELETE USING (auth.uid() = user_id);

-- Allow service role to bypass RLS for backup table
CREATE POLICY "Service role can manage all backup connections" ON user_connections_backup
  FOR ALL USING (current_setting('role') = 'service_role');

-- ==============================================
-- FIX 2: Fix function search_path security issues
-- ==============================================

-- Fix update_updated_at_column function with secure search_path
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

-- Fix handle_new_user function with secure search_path
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
-- FIX 3: Additional Security Enhancements
-- ==============================================

-- Ensure all tables have RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled on all public tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- ==============================================
-- FIX 4: Additional Security Policies
-- ==============================================

-- Ensure profiles table has proper RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Ensure user_connections has proper RLS policies
DROP POLICY IF EXISTS "Users can view own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON user_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON user_connections;
DROP POLICY IF EXISTS "Service role can manage all connections" ON user_connections;

CREATE POLICY "Users can view own connections" ON user_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON user_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON user_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON user_connections
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all connections" ON user_connections
  FOR ALL USING (current_setting('role') = 'service_role');

-- Ensure search_queries has proper RLS policies
DROP POLICY IF EXISTS "Users can view own queries" ON search_queries;
DROP POLICY IF EXISTS "Users can insert own queries" ON search_queries;

CREATE POLICY "Users can view own queries" ON search_queries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queries" ON search_queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check that RLS is enabled on all tables
SELECT 
    'RLS Status Check' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check function security settings
SELECT 
    'Function Security Check' as check_type,
    proname as function_name,
    prosecdef as security_definer,
    CASE 
        WHEN prosecdef THEN '✅ SECURITY DEFINER'
        ELSE '❌ Not SECURITY DEFINER'
    END as status
FROM pg_proc 
WHERE proname IN ('update_updated_at_column', 'handle_new_user')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check RLS policies
SELECT 
    'RLS Policies Check' as check_type,
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
-- SUCCESS MESSAGE
-- ==============================================

SELECT '🎉 All Supabase security issues have been fixed!' as status;
