-- Phase 1: PRD Builder Schema
-- Create PRD core tables with RLS and required indexes/constraints

-- PRD versions table
CREATE TABLE IF NOT EXISTS prd_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRD sections (with UNIQUE constraint for upsert)
CREATE TABLE IF NOT EXISTS prd_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prd_version_id UUID REFERENCES prd_versions(id) ON DELETE CASCADE NOT NULL,
  section_id TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prd_version_id, section_id)
);

-- Source references (links back to document_chunks or documents)
CREATE TABLE IF NOT EXISTS prd_source_refs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prd_version_id UUID REFERENCES prd_versions(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('slack', 'notion', 'google_drive')),
  source_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prd_versions_user ON prd_versions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prd_sections_version ON prd_sections(prd_version_id, section_id);
CREATE INDEX IF NOT EXISTS idx_prd_source_refs_version ON prd_source_refs(prd_version_id);

-- Enable Row Level Security
ALTER TABLE prd_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_source_refs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prd_versions
DO $$ BEGIN
  CREATE POLICY "Users can view own PRDs" ON prd_versions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own PRDs" ON prd_versions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own PRDs" ON prd_versions
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS Policies for prd_sections
DO $$ BEGIN
  CREATE POLICY "Users can view own sections" ON prd_sections
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM prd_versions 
      WHERE id = prd_sections.prd_version_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own sections" ON prd_sections
    FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM prd_versions 
      WHERE id = prd_sections.prd_version_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own sections" ON prd_sections
    FOR UPDATE USING (EXISTS (
      SELECT 1 FROM prd_versions 
      WHERE id = prd_sections.prd_version_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS Policies for prd_source_refs
DO $$ BEGIN
  CREATE POLICY "Users can view own source refs" ON prd_source_refs
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM prd_versions 
      WHERE id = prd_source_refs.prd_version_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own source refs" ON prd_source_refs
    FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM prd_versions 
      WHERE id = prd_source_refs.prd_version_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


