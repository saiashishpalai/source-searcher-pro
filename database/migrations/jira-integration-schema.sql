-- Jira Integration Schema Migration
-- Phase 1A: PRD to Jira Core Flow
-- This migration adds all tables and schema changes needed for Jira integration

-- ============================================================================
-- 1. Extend prd_versions table with new columns
-- ============================================================================

-- Add classification column for PRD size (small/medium/large)
ALTER TABLE prd_versions 
ADD COLUMN IF NOT EXISTS classification TEXT CHECK (classification IN ('small', 'medium', 'large'));

-- Add granularity mode for ticket generation strategy
ALTER TABLE prd_versions 
ADD COLUMN IF NOT EXISTS granularity_mode TEXT DEFAULT 'rolled_up' 
CHECK (granularity_mode IN ('rolled_up', 'balanced', 'granular'));

-- Add locked_at timestamp for freezing PRD content after execution
ALTER TABLE prd_versions 
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Add Jira project reference (overrideable per PRD)
ALTER TABLE prd_versions 
ADD COLUMN IF NOT EXISTS jira_project_key TEXT;

ALTER TABLE prd_versions 
ADD COLUMN IF NOT EXISTS jira_project_id TEXT;

-- Update status constraint to include ready_for_execution
-- First drop the existing constraint if it exists
DO $$ 
BEGIN
    ALTER TABLE prd_versions DROP CONSTRAINT IF EXISTS prd_versions_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add the new constraint with ready_for_execution status
ALTER TABLE prd_versions 
ADD CONSTRAINT prd_versions_status_check 
CHECK (status IN ('draft', 'published', 'ready_for_execution', 'archived'));


-- ============================================================================
-- 2. Create jira_connections table for OAuth credentials
-- ============================================================================

CREATE TABLE IF NOT EXISTS jira_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- OAuth tokens (encrypted at rest by Supabase)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Jira Cloud instance details
    cloud_id TEXT NOT NULL,                    -- Atlassian cloud instance ID
    site_url TEXT NOT NULL,                    -- e.g., https://yoursite.atlassian.net
    
    -- User's Jira identity
    jira_account_id TEXT,                      -- Atlassian account ID
    jira_email TEXT,
    jira_display_name TEXT,
    
    -- Default project configuration
    default_project_key TEXT,
    default_project_id TEXT,
    default_project_name TEXT,
    
    -- Cached project metadata
    available_issue_types JSONB DEFAULT '[]',  -- Cache of issue types for quick access
    
    -- OAuth metadata
    scopes_granted TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ
);

-- Indexes for jira_connections
CREATE INDEX IF NOT EXISTS idx_jira_connections_user_id ON jira_connections(user_id);

-- Enable RLS
ALTER TABLE jira_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jira_connections
DO $$ BEGIN
    CREATE POLICY "Users can view own Jira connection" ON jira_connections
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own Jira connection" ON jira_connections
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own Jira connection" ON jira_connections
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own Jira connection" ON jira_connections
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role policy for backend operations
DO $$ BEGIN
    CREATE POLICY "Service role can manage all Jira connections" ON jira_connections
        FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 3. Create prd_jira_tickets table for draft and published tickets
-- ============================================================================

CREATE TABLE IF NOT EXISTS prd_jira_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prd_version_id UUID REFERENCES prd_versions(id) ON DELETE CASCADE NOT NULL,
    
    -- Jira issue identity (null until published)
    jira_issue_key TEXT,                       -- e.g., "PROJ-123"
    jira_issue_id TEXT,                        -- Jira's internal immutable ID
    issue_type TEXT NOT NULL,                  -- 'epic' | 'story' | 'task'
    
    -- Parent linkage (for stories under epics)
    parent_ticket_id UUID REFERENCES prd_jira_tickets(id),
    
    -- Draft content (editable before publishing)
    draft_summary TEXT NOT NULL,               -- Ticket title (max 255 chars for Jira)
    draft_description TEXT,                    -- Full description (markdown)
    draft_acceptance_criteria TEXT,            -- ACs (markdown, stored separately for clarity)
    draft_priority TEXT DEFAULT 'medium' CHECK (draft_priority IN ('lowest', 'low', 'medium', 'high', 'highest')),
    
    -- Feature grouping (for organizing tickets)
    feature_area TEXT,                         -- Inferred feature area from PRD
    
    -- Mapping to PRD content (for drift detection)
    source_section TEXT,                       -- Which PRD section this came from
    source_content_hash TEXT,                  -- SHA-256 hash for change detection
    
    -- Ticket lifecycle
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'published')),
    reviewed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    
    -- Synced Jira fields (read-only, updated by sync)
    last_synced_at TIMESTAMPTZ,
    jira_status TEXT,                          -- 'To Do' | 'In Progress' | 'QA' | 'Done' | 'Blocked'
    jira_status_category TEXT,                 -- 'todo' | 'in_progress' | 'done'
    jira_assignee_id TEXT,
    jira_assignee_name TEXT,
    jira_sprint_id TEXT,
    jira_sprint_name TEXT,
    jira_priority TEXT,
    jira_updated_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ordering within PRD (for display consistency)
    sort_order INT DEFAULT 0
);

-- Indexes for prd_jira_tickets
CREATE INDEX IF NOT EXISTS idx_prd_jira_tickets_prd ON prd_jira_tickets(prd_version_id);
CREATE INDEX IF NOT EXISTS idx_prd_jira_tickets_status ON prd_jira_tickets(status);
CREATE INDEX IF NOT EXISTS idx_prd_jira_tickets_jira_key ON prd_jira_tickets(jira_issue_key) WHERE jira_issue_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prd_jira_tickets_parent ON prd_jira_tickets(parent_ticket_id) WHERE parent_ticket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prd_jira_tickets_issue_type ON prd_jira_tickets(issue_type);

-- Enable RLS
ALTER TABLE prd_jira_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prd_jira_tickets (access through PRD ownership)
DO $$ BEGIN
    CREATE POLICY "Users can view own PRD tickets" ON prd_jira_tickets
        FOR SELECT USING (EXISTS (
            SELECT 1 FROM prd_versions 
            WHERE id = prd_jira_tickets.prd_version_id AND user_id = auth.uid()
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own PRD tickets" ON prd_jira_tickets
        FOR INSERT WITH CHECK (EXISTS (
            SELECT 1 FROM prd_versions 
            WHERE id = prd_jira_tickets.prd_version_id AND user_id = auth.uid()
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own PRD tickets" ON prd_jira_tickets
        FOR UPDATE USING (EXISTS (
            SELECT 1 FROM prd_versions 
            WHERE id = prd_jira_tickets.prd_version_id AND user_id = auth.uid()
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own PRD tickets" ON prd_jira_tickets
        FOR DELETE USING (EXISTS (
            SELECT 1 FROM prd_versions 
            WHERE id = prd_jira_tickets.prd_version_id AND user_id = auth.uid()
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role policy for backend sync operations
DO $$ BEGIN
    CREATE POLICY "Service role can manage all PRD tickets" ON prd_jira_tickets
        FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 4. Create prd_drift_logs table for tracking PRD changes vs Jira
-- ============================================================================

CREATE TABLE IF NOT EXISTS prd_drift_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prd_version_id UUID REFERENCES prd_versions(id) ON DELETE CASCADE NOT NULL,
    
    -- What changed
    change_type TEXT NOT NULL CHECK (change_type IN ('prd_edited', 'jira_status_change', 'scope_change')),
    change_summary TEXT NOT NULL,              -- Human-readable description
    changed_sections TEXT[],                   -- Which PRD sections changed
    change_details JSONB,                      -- Detailed diff info (optional)
    
    -- Impact assessment
    affected_ticket_ids UUID[],                -- References to prd_jira_tickets
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    
    -- AI-suggested action
    suggested_action TEXT,                     -- LLM-generated suggestion
    suggested_action_type TEXT CHECK (suggested_action_type IN ('create_ticket', 'update_ticket', 'ignore', 'review')),
    
    -- Resolution tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'dismissed')),
    resolution TEXT,                           -- What action was taken
    resolved_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for prd_drift_logs
CREATE INDEX IF NOT EXISTS idx_prd_drift_logs_prd ON prd_drift_logs(prd_version_id);
CREATE INDEX IF NOT EXISTS idx_prd_drift_logs_status ON prd_drift_logs(status);
CREATE INDEX IF NOT EXISTS idx_prd_drift_logs_severity ON prd_drift_logs(severity);
CREATE INDEX IF NOT EXISTS idx_prd_drift_logs_detected ON prd_drift_logs(detected_at DESC);

-- Enable RLS
ALTER TABLE prd_drift_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prd_drift_logs
DO $$ BEGIN
    CREATE POLICY "Users can view own drift logs" ON prd_drift_logs
        FOR SELECT USING (EXISTS (
            SELECT 1 FROM prd_versions 
            WHERE id = prd_drift_logs.prd_version_id AND user_id = auth.uid()
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own drift logs" ON prd_drift_logs
        FOR INSERT WITH CHECK (EXISTS (
            SELECT 1 FROM prd_versions 
            WHERE id = prd_drift_logs.prd_version_id AND user_id = auth.uid()
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own drift logs" ON prd_drift_logs
        FOR UPDATE USING (EXISTS (
            SELECT 1 FROM prd_versions 
            WHERE id = prd_drift_logs.prd_version_id AND user_id = auth.uid()
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role policy
DO $$ BEGIN
    CREATE POLICY "Service role can manage all drift logs" ON prd_drift_logs
        FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 5. Create prd_artifacts table for generated documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS prd_artifacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prd_version_id UUID REFERENCES prd_versions(id) ON DELETE CASCADE NOT NULL,
    
    -- Artifact type
    artifact_type TEXT NOT NULL CHECK (artifact_type IN (
        'release_notes', 
        'release_summary', 
        'weekly_update',
        'tech_spec',
        'test_plan'
    )),
    
    -- Content
    title TEXT,
    content TEXT NOT NULL,                     -- Markdown content
    
    -- Generation context
    source_event TEXT DEFAULT 'manual' CHECK (source_event IN (
        'manual', 
        'scheduled', 
        'prd_change', 
        'jira_update',
        'qa_reached',
        'release'
    )),
    version INT DEFAULT 1,
    
    -- Input context used for generation
    generation_context JSONB,                  -- What data was used to generate
    
    -- Export tracking
    exported_to TEXT,                          -- 'slack' | 'email' | 'confluence' | null
    exported_at TIMESTAMPTZ,
    export_metadata JSONB,                     -- Channel ID, thread TS, etc.
    
    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for prd_artifacts
CREATE INDEX IF NOT EXISTS idx_prd_artifacts_prd ON prd_artifacts(prd_version_id);
CREATE INDEX IF NOT EXISTS idx_prd_artifacts_type ON prd_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_prd_artifacts_generated ON prd_artifacts(generated_at DESC);

-- Enable RLS
ALTER TABLE prd_artifacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prd_artifacts
DO $$ BEGIN
    CREATE POLICY "Users can view own artifacts" ON prd_artifacts
        FOR SELECT USING (EXISTS (
            SELECT 1 FROM prd_versions 
            WHERE id = prd_artifacts.prd_version_id AND user_id = auth.uid()
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own artifacts" ON prd_artifacts
        FOR INSERT WITH CHECK (EXISTS (
            SELECT 1 FROM prd_versions 
            WHERE id = prd_artifacts.prd_version_id AND user_id = auth.uid()
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own artifacts" ON prd_artifacts
        FOR UPDATE USING (EXISTS (
            SELECT 1 FROM prd_versions 
            WHERE id = prd_artifacts.prd_version_id AND user_id = auth.uid()
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own artifacts" ON prd_artifacts
        FOR DELETE USING (EXISTS (
            SELECT 1 FROM prd_versions 
            WHERE id = prd_artifacts.prd_version_id AND user_id = auth.uid()
        ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Service role policy
DO $$ BEGIN
    CREATE POLICY "Service role can manage all artifacts" ON prd_artifacts
        FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 6. Create updated_at triggers for new tables
-- ============================================================================

-- Trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
DROP TRIGGER IF EXISTS update_jira_connections_updated_at ON jira_connections;
CREATE TRIGGER update_jira_connections_updated_at
    BEFORE UPDATE ON jira_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prd_jira_tickets_updated_at ON prd_jira_tickets;
CREATE TRIGGER update_prd_jira_tickets_updated_at
    BEFORE UPDATE ON prd_jira_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prd_artifacts_updated_at ON prd_artifacts;
CREATE TRIGGER update_prd_artifacts_updated_at
    BEFORE UPDATE ON prd_artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 7. Helper functions for Jira integration
-- ============================================================================

-- Function to get all tickets for a PRD with hierarchy
CREATE OR REPLACE FUNCTION get_prd_tickets_with_hierarchy(p_prd_version_id UUID)
RETURNS TABLE (
    id UUID,
    jira_issue_key TEXT,
    issue_type TEXT,
    draft_summary TEXT,
    draft_description TEXT,
    draft_acceptance_criteria TEXT,
    draft_priority TEXT,
    feature_area TEXT,
    status TEXT,
    jira_status TEXT,
    jira_assignee_name TEXT,
    parent_ticket_id UUID,
    parent_jira_key TEXT,
    sort_order INT,
    depth INT
) AS $$
WITH RECURSIVE ticket_tree AS (
    -- Base case: root tickets (epics or standalone stories)
    SELECT 
        t.id,
        t.jira_issue_key,
        t.issue_type,
        t.draft_summary,
        t.draft_description,
        t.draft_acceptance_criteria,
        t.draft_priority,
        t.feature_area,
        t.status,
        t.jira_status,
        t.jira_assignee_name,
        t.parent_ticket_id,
        NULL::TEXT as parent_jira_key,
        t.sort_order,
        0 as depth
    FROM prd_jira_tickets t
    WHERE t.prd_version_id = p_prd_version_id
      AND t.parent_ticket_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child tickets
    SELECT 
        t.id,
        t.jira_issue_key,
        t.issue_type,
        t.draft_summary,
        t.draft_description,
        t.draft_acceptance_criteria,
        t.draft_priority,
        t.feature_area,
        t.status,
        t.jira_status,
        t.jira_assignee_name,
        t.parent_ticket_id,
        tt.jira_issue_key as parent_jira_key,
        t.sort_order,
        tt.depth + 1
    FROM prd_jira_tickets t
    INNER JOIN ticket_tree tt ON t.parent_ticket_id = tt.id
)
SELECT * FROM ticket_tree
ORDER BY depth, sort_order, draft_summary;
$$ LANGUAGE SQL STABLE;


-- Function to calculate PRD execution progress
CREATE OR REPLACE FUNCTION get_prd_execution_progress(p_prd_version_id UUID)
RETURNS TABLE (
    total_tickets INT,
    published_tickets INT,
    draft_tickets INT,
    approved_tickets INT,
    rejected_tickets INT,
    jira_todo INT,
    jira_in_progress INT,
    jira_qa INT,
    jira_done INT,
    jira_blocked INT,
    completion_percentage DECIMAL
) AS $$
SELECT 
    COUNT(*)::INT as total_tickets,
    COUNT(*) FILTER (WHERE status = 'published')::INT as published_tickets,
    COUNT(*) FILTER (WHERE status = 'draft')::INT as draft_tickets,
    COUNT(*) FILTER (WHERE status = 'approved')::INT as approved_tickets,
    COUNT(*) FILTER (WHERE status = 'rejected')::INT as rejected_tickets,
    COUNT(*) FILTER (WHERE jira_status_category = 'todo')::INT as jira_todo,
    COUNT(*) FILTER (WHERE jira_status_category = 'in_progress')::INT as jira_in_progress,
    COUNT(*) FILTER (WHERE jira_status = 'QA')::INT as jira_qa,
    COUNT(*) FILTER (WHERE jira_status_category = 'done')::INT as jira_done,
    COUNT(*) FILTER (WHERE jira_status = 'Blocked')::INT as jira_blocked,
    CASE 
        WHEN COUNT(*) FILTER (WHERE status = 'published') = 0 THEN 0
        ELSE ROUND(
            (COUNT(*) FILTER (WHERE jira_status_category = 'done')::DECIMAL / 
             NULLIF(COUNT(*) FILTER (WHERE status = 'published'), 0)) * 100, 
            1
        )
    END as completion_percentage
FROM prd_jira_tickets
WHERE prd_version_id = p_prd_version_id;
$$ LANGUAGE SQL STABLE;


-- ============================================================================
-- 8. Grant permissions for service role
-- ============================================================================

GRANT ALL ON jira_connections TO service_role;
GRANT ALL ON prd_jira_tickets TO service_role;
GRANT ALL ON prd_drift_logs TO service_role;
GRANT ALL ON prd_artifacts TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_prd_tickets_with_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_prd_tickets_with_hierarchy(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_prd_execution_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_prd_execution_progress(UUID) TO service_role;

