-- Fix Function Search Path Security Warnings
-- Run this SQL in Supabase SQL Editor to fix all function search_path warnings
--
-- The issue: Functions without SET search_path can be vulnerable to search_path manipulation
-- The fix: Recreate functions with SECURITY DEFINER and SET search_path = public

-- ==============================================
-- FIX 1: search_document_chunks
-- ==============================================

CREATE OR REPLACE FUNCTION public.search_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE
    (user_id_param IS NULL OR dc.user_id = user_id_param)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ==============================================
-- FIX 2: update_search_thread_timestamp
-- ==============================================

CREATE OR REPLACE FUNCTION public.update_search_thread_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==============================================
-- FIX 3: update_latest_version
-- ==============================================

CREATE OR REPLACE FUNCTION public.update_latest_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this document is marked as latest, ensure no other document in the same group is marked as latest
  IF NEW.is_latest = true AND NEW.version_group_id IS NOT NULL THEN
    UPDATE documents
    SET is_latest = false
    WHERE version_group_id = NEW.version_group_id
      AND id != NEW.id
      AND user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ==============================================
-- FIX 4: get_sync_stats
-- ==============================================

CREATE OR REPLACE FUNCTION public.get_sync_stats(p_user_id UUID, p_source_type TEXT)
RETURNS TABLE (
  total_documents BIGINT,
  total_chunks BIGINT,
  last_sync_at TIMESTAMPTZ,
  last_sync_type TEXT,
  files_in_last_sync INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM documents WHERE user_id = p_user_id AND source_type = p_source_type AND is_deleted = false),
    (SELECT COUNT(*) FROM document_chunks dc
       JOIN documents d ON dc.document_id = d.id
       WHERE d.user_id = p_user_id AND d.source_type = p_source_type),
    sm.last_sync_at,
    sm.sync_type,
    sm.files_processed
  FROM sync_metadata sm
  WHERE sm.user_id = p_user_id AND sm.source_type = p_source_type;
END;
$$;

-- ==============================================
-- FIX 5: create_prd_version
-- ==============================================

CREATE OR REPLACE FUNCTION public.create_prd_version(
  p_source_prd_id UUID,
  p_user_id UUID,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  version INTEGER,
  version_group_id UUID,
  status TEXT,
  change_summary TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_prd RECORD;
  v_new_version INTEGER;
  v_new_prd_id UUID;
BEGIN
  -- Lock the source PRD to prevent race conditions
  SELECT * INTO v_source_prd
  FROM prd_versions
  WHERE prd_versions.id = p_source_prd_id
    AND prd_versions.user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source PRD not found or access denied';
  END IF;
  
  -- Get next version number (atomic within transaction)
  SELECT COALESCE(MAX(pv.version), 0) + 1 INTO v_new_version
  FROM prd_versions pv
  WHERE pv.version_group_id = v_source_prd.version_group_id;
  
  -- Create new version
  INSERT INTO prd_versions (
    user_id,
    title,
    version,
    version_group_id,
    status,
    change_summary,
    created_by
  )
  VALUES (
    p_user_id,
    v_source_prd.title,
    v_new_version,
    v_source_prd.version_group_id,
    'draft',
    p_change_summary,
    p_user_id
  )
  RETURNING prd_versions.id INTO v_new_prd_id;
  
  -- Copy sections from source PRD
  INSERT INTO prd_sections (prd_version_id, section_id, content, metadata)
  SELECT v_new_prd_id, ps.section_id, ps.content, ps.metadata
  FROM prd_sections ps
  WHERE ps.prd_version_id = p_source_prd_id;
  
  -- Return new PRD
  RETURN QUERY
  SELECT 
    pv.id,
    pv.title,
    pv.version,
    pv.version_group_id,
    pv.status,
    pv.change_summary,
    pv.created_at
  FROM prd_versions pv
  WHERE pv.id = v_new_prd_id;
END;
$$;

-- ==============================================
-- FIX 6: check_user_exists
-- ==============================================

CREATE OR REPLACE FUNCTION public.check_user_exists(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Check if user exists in auth.users table
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = user_email
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO anon;

-- ==============================================
-- FIX 7: update_updated_at_column
-- ==============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ==============================================
-- FIX 8: Move vector extension to extensions schema
-- ==============================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move the vector extension to the extensions schema
-- NOTE: This requires dropping and recreating the extension
-- Make sure there are no dependent objects, or this will fail

-- First, let's check if we can move it (this is a safe check)
DO $$
BEGIN
  -- Check if vector extension exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'vector' AND n.nspname = 'public'
  ) THEN
    RAISE NOTICE 'Vector extension found in public schema.';
    RAISE NOTICE 'To move it, you may need to:';
    RAISE NOTICE '1. Backup your vector data';
    RAISE NOTICE '2. Drop dependent objects temporarily';
    RAISE NOTICE '3. Run: ALTER EXTENSION vector SET SCHEMA extensions;';
    RAISE NOTICE '4. Recreate dependent objects';
    RAISE NOTICE '';
    RAISE NOTICE 'Attempting to move extension...';
  END IF;
END $$;

-- Try to move the extension (this may fail if there are dependent objects)
-- If it fails, you'll need to handle the migration manually
DO $$
BEGIN
  ALTER EXTENSION vector SET SCHEMA extensions;
  RAISE NOTICE 'Successfully moved vector extension to extensions schema!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not automatically move vector extension: %', SQLERRM;
    RAISE NOTICE 'You may need to manually migrate the extension.';
    RAISE NOTICE 'See: https://supabase.com/docs/guides/database/extensions#migrating-extensions';
END $$;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Check that all functions have proper search_path set
SELECT 
    'Function Check' as check_type,
    p.proname as function_name,
    CASE 
        WHEN p.prosecdef THEN '✅ SECURITY DEFINER'
        ELSE '❌ Not SECURITY DEFINER'
    END as security_status,
    CASE
        WHEN p.proconfig IS NOT NULL AND array_to_string(p.proconfig, ',') LIKE '%search_path%'
        THEN '✅ search_path set'
        ELSE '❌ search_path not set'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'search_document_chunks',
    'update_search_thread_timestamp',
    'update_latest_version',
    'get_sync_stats',
    'create_prd_version',
    'check_user_exists',
    'update_updated_at_column'
)
ORDER BY p.proname;

-- Check vector extension location
SELECT 
    'Extension Check' as check_type,
    e.extname as extension_name,
    n.nspname as schema,
    CASE 
        WHEN n.nspname = 'extensions' THEN '✅ Moved to extensions schema'
        WHEN n.nspname = 'public' THEN '⚠️ Still in public schema'
        ELSE '❓ Unknown schema'
    END as status
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'vector';

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

SELECT '🎉 Function search_path security fixes applied!' as status;
SELECT 'Refresh the Security Advisor in Supabase Dashboard to verify the fixes.' as next_step;

-- ==============================================
-- MANUAL STEP REQUIRED: Leaked Password Protection
-- ==============================================
-- The "Leaked Password Protection Disabled" warning cannot be fixed via SQL.
-- 
-- To enable it:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Authentication → Settings → Security
-- 3. Enable "Leaked Password Protection"
-- 
-- This feature checks passwords against HaveIBeenPwned.org to prevent
-- users from using compromised passwords.
