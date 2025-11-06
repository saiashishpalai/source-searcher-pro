-- Delete all PRDs and related data
-- WARNING: This will delete ALL PRDs for ALL users. Use with caution.

-- Delete in order to respect foreign key constraints:
-- 1. prd_source_refs (references prd_versions)
-- 2. prd_sections (references prd_versions)
-- 3. prd_versions (main table)

BEGIN;

-- Delete all source references
DELETE FROM prd_source_refs;

-- Delete all sections
DELETE FROM prd_sections;

-- Delete all PRD versions
DELETE FROM prd_versions;

COMMIT;

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM prd_versions) as prd_versions_count,
  (SELECT COUNT(*) FROM prd_sections) as prd_sections_count,
  (SELECT COUNT(*) FROM prd_source_refs) as prd_source_refs_count;

