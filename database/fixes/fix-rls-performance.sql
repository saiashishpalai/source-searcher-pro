-- Fix RLS Performance Warnings
-- Run this SQL in Supabase SQL Editor to fix all RLS performance issues
--
-- Issues fixed:
-- 1. auth_rls_initplan: Replace auth.uid() with (select auth.uid()) for better performance
-- 2. multiple_permissive_policies: Consolidate overlapping policies

-- ==============================================
-- FIX: user_connections table
-- Issues: auth_rls_initplan + multiple_permissive_policies
-- ==============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own connections" ON public.user_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON public.user_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.user_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON public.user_connections;
DROP POLICY IF EXISTS "Service role can manage all connections" ON public.user_connections;
DROP POLICY IF EXISTS "Service role full access" ON public.user_connections;
DROP POLICY IF EXISTS "Users can manage own connections" ON public.user_connections;

-- Create optimized policies with (select auth.uid())
CREATE POLICY "Users can view own connections" ON public.user_connections
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own connections" ON public.user_connections
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own connections" ON public.user_connections
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own connections" ON public.user_connections
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Service role policy (role-specific to avoid multiple_permissive_policies)
CREATE POLICY "Service role full access" ON public.user_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX: sync_metadata table
-- Issues: auth_rls_initplan + multiple_permissive_policies
-- ==============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own sync metadata" ON public.sync_metadata;
DROP POLICY IF EXISTS "Users can manage own sync metadata" ON public.sync_metadata;
DROP POLICY IF EXISTS "Service role full access" ON public.sync_metadata;

-- Create single optimized policy for all operations
CREATE POLICY "Users can manage own sync metadata" ON public.sync_metadata
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Service role policy
CREATE POLICY "Service role full access" ON public.sync_metadata
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX: documents table
-- Issue: auth_rls_initplan
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
DROP POLICY IF EXISTS "Service role full access" ON public.documents;

-- Create optimized policies
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Service role policy
CREATE POLICY "Service role full access" ON public.documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX: document_chunks table
-- Issue: auth_rls_initplan
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Users can insert own chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Users can delete own chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Service role full access" ON public.document_chunks;

-- Create optimized policies
CREATE POLICY "Users can view own chunks" ON public.document_chunks
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own chunks" ON public.document_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own chunks" ON public.document_chunks
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Service role policy
CREATE POLICY "Service role full access" ON public.document_chunks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX: search_history table
-- Issue: auth_rls_initplan
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can insert own search history" ON public.search_history;
DROP POLICY IF EXISTS "Service role full access" ON public.search_history;

-- Create optimized policies
CREATE POLICY "Users can view own search history" ON public.search_history
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own search history" ON public.search_history
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Service role policy
CREATE POLICY "Service role full access" ON public.search_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX: search_threads table
-- Issue: auth_rls_initplan
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own threads" ON public.search_threads;
DROP POLICY IF EXISTS "Users can insert own threads" ON public.search_threads;
DROP POLICY IF EXISTS "Users can update own threads" ON public.search_threads;
DROP POLICY IF EXISTS "Users can delete own threads" ON public.search_threads;
DROP POLICY IF EXISTS "Service role full access" ON public.search_threads;

-- Create optimized policies
CREATE POLICY "Users can view own threads" ON public.search_threads
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own threads" ON public.search_threads
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own threads" ON public.search_threads
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own threads" ON public.search_threads
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Service role policy
CREATE POLICY "Service role full access" ON public.search_threads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX: search_thread_results table
-- Issue: auth_rls_initplan
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own thread results" ON public.search_thread_results;
DROP POLICY IF EXISTS "Users can insert own thread results" ON public.search_thread_results;
DROP POLICY IF EXISTS "Users can delete own thread results" ON public.search_thread_results;
DROP POLICY IF EXISTS "Service role full access" ON public.search_thread_results;

-- Create optimized policies (via join to search_threads)
CREATE POLICY "Users can view own thread results" ON public.search_thread_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.search_threads st
      WHERE st.id = search_thread_results.thread_id
      AND st.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own thread results" ON public.search_thread_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.search_threads st
      WHERE st.id = search_thread_results.thread_id
      AND st.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own thread results" ON public.search_thread_results
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.search_threads st
      WHERE st.id = search_thread_results.thread_id
      AND st.user_id = (select auth.uid())
    )
  );

-- Service role policy
CREATE POLICY "Service role full access" ON public.search_thread_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX: prd_versions table
-- Issue: auth_rls_initplan
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own PRDs" ON public.prd_versions;
DROP POLICY IF EXISTS "Users can create own PRDs" ON public.prd_versions;
DROP POLICY IF EXISTS "Users can update own PRDs" ON public.prd_versions;
DROP POLICY IF EXISTS "Users can delete own PRDs" ON public.prd_versions;
DROP POLICY IF EXISTS "Service role full access" ON public.prd_versions;

-- Create optimized policies
CREATE POLICY "Users can view own PRDs" ON public.prd_versions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own PRDs" ON public.prd_versions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own PRDs" ON public.prd_versions
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own PRDs" ON public.prd_versions
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Service role policy
CREATE POLICY "Service role full access" ON public.prd_versions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX: prd_sections table
-- Issue: auth_rls_initplan
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own sections" ON public.prd_sections;
DROP POLICY IF EXISTS "Users can create own sections" ON public.prd_sections;
DROP POLICY IF EXISTS "Users can update own sections" ON public.prd_sections;
DROP POLICY IF EXISTS "Users can delete own sections" ON public.prd_sections;
DROP POLICY IF EXISTS "Service role full access" ON public.prd_sections;

-- Create optimized policies (via join to prd_versions)
CREATE POLICY "Users can view own sections" ON public.prd_sections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prd_versions pv
      WHERE pv.id = prd_sections.prd_version_id
      AND pv.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create own sections" ON public.prd_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prd_versions pv
      WHERE pv.id = prd_sections.prd_version_id
      AND pv.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own sections" ON public.prd_sections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prd_versions pv
      WHERE pv.id = prd_sections.prd_version_id
      AND pv.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own sections" ON public.prd_sections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prd_versions pv
      WHERE pv.id = prd_sections.prd_version_id
      AND pv.user_id = (select auth.uid())
    )
  );

-- Service role policy
CREATE POLICY "Service role full access" ON public.prd_sections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- FIX: prd_source_refs table
-- Issue: auth_rls_initplan
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own source refs" ON public.prd_source_refs;
DROP POLICY IF EXISTS "Users can create own source refs" ON public.prd_source_refs;
DROP POLICY IF EXISTS "Users can delete own source refs" ON public.prd_source_refs;
DROP POLICY IF EXISTS "Service role full access" ON public.prd_source_refs;

-- Create optimized policies (via join to prd_versions)
CREATE POLICY "Users can view own source refs" ON public.prd_source_refs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prd_versions pv
      WHERE pv.id = prd_source_refs.prd_version_id
      AND pv.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create own source refs" ON public.prd_source_refs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prd_versions pv
      WHERE pv.id = prd_source_refs.prd_version_id
      AND pv.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own source refs" ON public.prd_source_refs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prd_versions pv
      WHERE pv.id = prd_source_refs.prd_version_id
      AND pv.user_id = (select auth.uid())
    )
  );

-- Service role policy
CREATE POLICY "Service role full access" ON public.prd_source_refs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Check policies are using optimized auth.uid() pattern
SELECT 
    'Policy Check' as check_type,
    tablename,
    policyname,
    CASE 
        WHEN qual::text LIKE '%select auth.uid()%' OR qual::text LIKE '%SELECT auth.uid()%'
        THEN '✅ Optimized'
        WHEN qual::text LIKE '%auth.uid()%'
        THEN '⚠️ Not optimized'
        ELSE '✅ N/A'
    END as optimization_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'user_connections',
    'sync_metadata', 
    'documents',
    'document_chunks',
    'search_history',
    'search_threads',
    'search_thread_results',
    'prd_versions',
    'prd_sections',
    'prd_source_refs'
)
ORDER BY tablename, policyname;

-- Check for multiple permissive policies per table/action
SELECT 
    'Multiple Policies Check' as check_type,
    tablename,
    cmd,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ Single policy'
        WHEN COUNT(*) = 2 AND COUNT(*) FILTER (WHERE 'service_role' = ANY(roles)) = 1 THEN '✅ User + Service role'
        ELSE '⚠️ Check policies'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('user_connections', 'sync_metadata')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

SELECT '🎉 RLS performance optimizations applied!' as status;
SELECT 'All policies now use (select auth.uid()) for better performance.' as detail;
SELECT 'Refresh the Security Advisor in Supabase Dashboard to verify.' as next_step;
