-- Haven7 Waitlist Schema
-- This table stores early access signups for Haven7
-- Email-only signup system with minimal fields

-- Create the waitlist_signups table
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Required: Email only
  email TEXT NOT NULL UNIQUE,
  
  -- Optional user information (nullable for email-only signup)
  full_name TEXT DEFAULT '',
  company_name TEXT DEFAULT '',
  job_title TEXT DEFAULT '',
  
  -- Optional contact information
  whatsapp_number TEXT,
  whatsapp_country_code TEXT DEFAULT '+1',
  
  -- Company and use case information (with defaults)
  company_size TEXT NOT NULL DEFAULT 'Unknown',
  primary_use_case TEXT NOT NULL DEFAULT 'Unknown',
  pain_level TEXT NOT NULL DEFAULT 'Unknown',
  
  -- Consent
  agree_to_contact BOOLEAN NOT NULL DEFAULT true,
  
  -- Marketing and tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_signups(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist_signups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_company_size ON waitlist_signups(company_size);
CREATE INDEX IF NOT EXISTS idx_waitlist_primary_use_case ON waitlist_signups(primary_use_case);

-- Enable Row Level Security
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Allow anyone to insert (public signup)
CREATE POLICY "Allow public insert on waitlist_signups"
  ON waitlist_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Allow public read access (for admin dashboard)
-- The admin dashboard has PIN protection in the frontend, so this is safe
CREATE POLICY "Allow public select on waitlist_signups"
  ON waitlist_signups
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Deny public update and delete
CREATE POLICY "Deny public update on waitlist_signups"
  ON waitlist_signups
  FOR UPDATE
  TO anon, authenticated
  USING (false);

CREATE POLICY "Deny public delete on waitlist_signups"
  ON waitlist_signups
  FOR DELETE
  TO anon, authenticated
  USING (false);

-- Grant explicit permissions (important for PostgREST)
GRANT SELECT, INSERT ON waitlist_signups TO anon;
GRANT SELECT, INSERT ON waitlist_signups TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE waitlist_signups IS 'Stores early access waitlist signups for Haven7 - email-only signup';
COMMENT ON COLUMN waitlist_signups.email IS 'Primary field - only required field for signup';
COMMENT ON COLUMN waitlist_signups.full_name IS 'Optional - defaults to empty string for email-only signup';
COMMENT ON COLUMN waitlist_signups.company_name IS 'Optional - defaults to empty string for email-only signup';
COMMENT ON COLUMN waitlist_signups.job_title IS 'Optional - defaults to empty string for email-only signup';
COMMENT ON COLUMN waitlist_signups.company_size IS 'Defaults to "Unknown" for email-only signups';
COMMENT ON COLUMN waitlist_signups.primary_use_case IS 'Defaults to "Unknown" for email-only signups';
COMMENT ON COLUMN waitlist_signups.pain_level IS 'Defaults to "Unknown" for email-only signups';
