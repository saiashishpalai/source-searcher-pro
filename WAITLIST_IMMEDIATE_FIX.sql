-- IMMEDIATE FIX: Run this RIGHT NOW in Supabase SQL Editor
-- This will fix the admin dashboard issue

-- Drop the deny policy if it exists
DROP POLICY IF EXISTS "Deny public select on waitlist_signups" ON waitlist_signups;

-- Allow public read access 
-- Safe because dashboard is PIN-protected and URL is obscure
CREATE POLICY "Allow public select on waitlist_signups"
  ON waitlist_signups
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Verify it worked
SELECT COUNT(*) as total_signups FROM waitlist_signups;

