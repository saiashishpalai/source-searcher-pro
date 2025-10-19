-- Version Linking Schema Migration
-- Adds version tracking columns to documents table for duplicate detection and version management

-- Add version tracking columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS version_group_id UUID,
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;

-- Create indexes for faster version queries
CREATE INDEX IF NOT EXISTS idx_version_group ON documents(version_group_id);
CREATE INDEX IF NOT EXISTS idx_user_latest ON documents(user_id, is_latest);

-- Add comments for documentation
COMMENT ON COLUMN documents.version_group_id IS 'Links related document versions together. Documents with same version_group_id are versions of the same content.';
COMMENT ON COLUMN documents.version_number IS 'Sequential version number within a version group. Higher numbers are newer versions.';
COMMENT ON COLUMN documents.is_latest IS 'True for the most recent version in a group. Only one document per version_group_id should have is_latest=true.';

-- Create a function to automatically update is_latest when version_number changes
CREATE OR REPLACE FUNCTION update_latest_version()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically manage is_latest flag
DROP TRIGGER IF EXISTS trigger_update_latest_version ON documents;
CREATE TRIGGER trigger_update_latest_version
  AFTER INSERT OR UPDATE OF is_latest, version_group_id ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_latest_version();

-- Add RLS policy for version_group_id (users can only see their own version groups)
-- This is already covered by existing RLS policies, but let's be explicit
-- The existing policies on user_id already protect this column
