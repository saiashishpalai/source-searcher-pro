-- Weekly Update Settings Migration
-- Stores user preferences for automated weekly updates

-- Create weekly_update_settings table
CREATE TABLE IF NOT EXISTS weekly_update_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Slack Configuration (uses existing Slack OAuth connection)
  slack_channel_id TEXT,          -- Channel ID where bot will post
  slack_channel_name TEXT,        -- For display purposes (e.g., "#product-updates")
  
  -- Schedule Configuration (for auto-generating drafts)
  schedule_day VARCHAR(10) NOT NULL DEFAULT 'friday', -- monday, tuesday, ..., sunday
  schedule_time TIME NOT NULL DEFAULT '17:00',        -- 24-hour format
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',        -- IANA timezone
  
  -- Tracking
  last_sent_at TIMESTAMP WITH TIME ZONE,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One settings record per user
  UNIQUE(user_id)
);

-- Create index for user lookup
CREATE INDEX IF NOT EXISTS idx_weekly_update_settings_user_id ON weekly_update_settings(user_id);

-- Create index for scheduler queries (find all settings for a specific day/time)
CREATE INDEX IF NOT EXISTS idx_weekly_update_settings_schedule 
ON weekly_update_settings(schedule_day, schedule_time);

-- Store generated updates history
CREATE TABLE IF NOT EXISTS weekly_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown content
  
  -- What was included
  prd_ids UUID[], -- Which PRDs were included
  ticket_snapshot JSONB, -- Snapshot of ticket statuses at generation time
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, sent, failed
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_to TEXT, -- Channel name or webhook identifier
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user's update history
CREATE INDEX IF NOT EXISTS idx_weekly_updates_user_id ON weekly_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_updates_created_at ON weekly_updates(created_at DESC);

-- Add RLS policies
ALTER TABLE weekly_update_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_updates ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY weekly_update_settings_user_policy ON weekly_update_settings
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own updates
CREATE POLICY weekly_updates_user_policy ON weekly_updates
  FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON weekly_update_settings TO authenticated;
GRANT ALL ON weekly_updates TO authenticated;

