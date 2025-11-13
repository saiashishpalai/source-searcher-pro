-- Add wireframe columns to prd_sections table
-- Migration: add-wireframe-columns
-- Purpose: Support wireframe upload and metadata storage for requirements generation
-- Prerequisite: prd_sections table must exist (run prd-builder-schema.sql first)

-- Verify prd_sections table exists before altering
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prd_sections') THEN
    RAISE EXCEPTION 'Table prd_sections does not exist. Please run database/migrations/prd-builder-schema.sql first.';
  END IF;
END $$;

-- Add wireframe_url column to store Supabase Storage URL
ALTER TABLE prd_sections
ADD COLUMN IF NOT EXISTS wireframe_url TEXT;

-- Add wireframe_metadata column to store upload metadata and analysis results
ALTER TABLE prd_sections
ADD COLUMN IF NOT EXISTS wireframe_metadata JSONB DEFAULT '{}';

-- Add index for querying sections with wireframes
CREATE INDEX IF NOT EXISTS idx_prd_sections_wireframe ON prd_sections(prd_version_id) 
WHERE wireframe_url IS NOT NULL;

-- Add comment explaining the wireframe_metadata structure
COMMENT ON COLUMN prd_sections.wireframe_metadata IS 'JSON metadata containing: filename, size, uploaded_at, vision_analysis (components_detected, confidence_score)';

