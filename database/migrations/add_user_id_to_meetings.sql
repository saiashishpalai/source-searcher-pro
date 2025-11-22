-- Add user_id column to meetings table
-- This is needed for auto-execution feature

ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);

-- Update existing meetings to have a default user_id if needed
-- (You may want to set this to a specific user or leave NULL for old meetings)
-- UPDATE meetings SET user_id = NULL WHERE user_id IS NULL;

