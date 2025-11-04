-- Fix duplicate version numbers within version groups
-- Run this BEFORE creating the unique index if you get duplicate errors
-- This will renumber all versions within each group sequentially

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

-- Verify no duplicates remain
SELECT version_group_id, version, COUNT(*) as count
FROM prd_versions
WHERE version_group_id IS NOT NULL
GROUP BY version_group_id, version
HAVING COUNT(*) > 1;
-- This should return 0 rows

