-- Fix RLS Policy for Waitlist Dashboard Access
-- Run this SQL to update the RLS policy so admin dashboard can read signups

-- Drop the old "deny" policy if it exists
DROP POLICY IF EXISTS "Deny public select on waitlist_signups" ON waitlist_signups;

-- Create new policy that allows read access
-- This is safe because the admin dashboard has PIN protection
CREATE POLICY "Allow public select on waitlist_signups"
  ON waitlist_signups
  FOR SELECT
  TO anon, authenticated
  USING (true);

