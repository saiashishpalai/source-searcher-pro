-- Add assembled_text column to prd_versions table for storing final PRD document
-- This column stores the complete PRD document generated from all 5 sections

ALTER TABLE prd_versions
ADD COLUMN IF NOT EXISTS assembled_text TEXT;

COMMENT ON COLUMN prd_versions.assembled_text IS 'Complete PRD document text assembled from all sections using GPT-4o-mini';

