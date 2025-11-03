-- Waitlist Email Tracking Migration
-- Adds columns to track email sending status

-- Add email tracking columns
ALTER TABLE waitlist_signups 
ADD COLUMN IF NOT EXISTS invite_email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS invite_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS maintenance_email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS maintenance_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_waitlist_invite_sent ON waitlist_signups(invite_email_sent);
CREATE INDEX IF NOT EXISTS idx_waitlist_maintenance_sent ON waitlist_signups(maintenance_email_sent);

-- Update RLS policy to allow updates (needed for tracking email status)
DROP POLICY IF EXISTS "Deny public update on waitlist_signups" ON waitlist_signups;

CREATE POLICY "Allow public update on waitlist_signups for email tracking"
  ON waitlist_signups
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON COLUMN waitlist_signups.invite_email_sent IS 'Whether invite email was sent (tracked when mailto link is opened)';
COMMENT ON COLUMN waitlist_signups.invite_email_sent_at IS 'Timestamp when invite email was sent';
COMMENT ON COLUMN waitlist_signups.maintenance_email_sent IS 'Whether maintenance mode email was sent (tracked when mailto link is opened)';
COMMENT ON COLUMN waitlist_signups.maintenance_email_sent_at IS 'Timestamp when maintenance mode email was sent';

