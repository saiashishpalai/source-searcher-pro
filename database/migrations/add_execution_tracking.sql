-- Create action_executions table to track all action executions
CREATE TABLE IF NOT EXISTS action_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('create_task', 'send_slack', 'create_page')),
  action_params JSONB NOT NULL,
  todoist_task_id TEXT,
  todoist_task_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'executing', 'success', 'failed', 'completed')) DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_action_executions_meeting_id ON action_executions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_executions_todoist_task_id ON action_executions(todoist_task_id);
CREATE INDEX IF NOT EXISTS idx_action_executions_status ON action_executions(status);

-- Update action_items table to add Todoist tracking fields
ALTER TABLE action_items 
ADD COLUMN IF NOT EXISTS todoist_task_id TEXT,
ADD COLUMN IF NOT EXISTS todoist_task_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

-- Create index for action_items todoist_task_id lookups
CREATE INDEX IF NOT EXISTS idx_action_items_todoist_task_id ON action_items(todoist_task_id);

