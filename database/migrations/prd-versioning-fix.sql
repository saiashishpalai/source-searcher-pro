-- PRD Versioning Fix Migration
-- Fixes broken title-based versioning with proper version_group_id approach
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add missing columns
ALTER TABLE prd_versions 
ADD COLUMN IF NOT EXISTS version_group_id UUID,
ADD COLUMN IF NOT EXISTS change_summary TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Step 2: Backfill version_group_id for existing PRDs
-- Group by title and user_id to create version groups
DO $$
DECLARE
  rec RECORD;
  group_id UUID;
  
BEGIN
  FOR rec IN 
    SELECT DISTINCT title, user_id 
    FROM prd_versions 
    WHERE version_group_id IS NULL
  LOOP
    -- Generate a new group ID for this title/user combination
    group_id := gen_random_uuid();
    
    -- Assign it to all PRDs with this title and user
    UPDATE prd_versions
    SET version_group_id = group_id
    WHERE title = rec.title 
      AND user_id = rec.user_id 
      AND version_group_id IS NULL;
  END LOOP;
END $$;

-- Step 2.5: Fix duplicate version numbers within each group
-- Renumber versions within each group to ensure uniqueness
DO $$
DECLARE
  group_rec RECORD;
  version_num INTEGER;
  prd_rec RECORD;
BEGIN
  -- For each version group, renumber versions sequentially
  FOR group_rec IN 
    SELECT DISTINCT version_group_id 
    FROM prd_versions 
    WHERE version_group_id IS NOT NULL
  LOOP
    version_num := 1;
    
    -- Order by created_at to preserve chronological order
    FOR prd_rec IN 
      SELECT id 
      FROM prd_versions 
      WHERE version_group_id = group_rec.version_group_id
      ORDER BY created_at ASC
    LOOP
      UPDATE prd_versions
      SET version = version_num
      WHERE id = prd_rec.id;
      
      version_num := version_num + 1;
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Make version_group_id NOT NULL
ALTER TABLE prd_versions
ALTER COLUMN version_group_id SET NOT NULL;

-- Step 4: Add index for fast version lookups
CREATE INDEX IF NOT EXISTS idx_prd_versions_group ON prd_versions(version_group_id, version);

-- Step 5: Add uniqueness constraint (version must be unique within a group)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prd_version_uniqueness ON prd_versions(version_group_id, version);

-- Step 6: Create atomic version creation function
CREATE OR REPLACE FUNCTION create_prd_version(
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
AS $$
DECLARE
  v_source_prd RECORD;
  v_new_version INTEGER;
  v_new_prd_id UUID;
BEGIN
  -- Lock the source PRD to prevent race conditions
  SELECT * INTO v_source_prd
  FROM prd_versions
  WHERE id = p_source_prd_id
    AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source PRD not found or access denied';
  END IF;
  
  -- Get next version number (atomic within transaction)
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version
  FROM prd_versions
  WHERE version_group_id = v_source_prd.version_group_id;
  
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
  SELECT v_new_prd_id, section_id, content, metadata
  FROM prd_sections
  WHERE prd_version_id = p_source_prd_id;
  
  -- Return new PRD
  RETURN QUERY
  SELECT 
    prd_versions.id,
    prd_versions.title,
    prd_versions.version,
    prd_versions.version_group_id,
    prd_versions.status,
    prd_versions.change_summary,
    prd_versions.created_at
  FROM prd_versions
  WHERE prd_versions.id = v_new_prd_id;
END;
$$;

-- Step 7: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_prd_version(UUID, UUID, TEXT) TO authenticated;

-- Step 8: Update RLS policies to allow service role access for function
-- (RLS is bypassed for SECURITY DEFINER functions, but good practice)

