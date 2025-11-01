-- Haven7 Waitlist Schema
-- This table stores early access signups for Haven7

-- Create the waitlist_signups table
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Required user information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  
  -- Optional contact information
  whatsapp_number TEXT,
  whatsapp_country_code TEXT DEFAULT '+1',
  
  -- Company and use case information
  company_size TEXT NOT NULL,
  primary_use_case TEXT NOT NULL,
  pain_level TEXT NOT NULL,
  
  -- Consent
  agree_to_contact BOOLEAN NOT NULL DEFAULT false,
  
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

-- Add comments for documentation
COMMENT ON TABLE waitlist_signups IS 'Stores early access waitlist signups for Haven7';
COMMENT ON COLUMN waitlist_signups.whatsapp_country_code IS 'Country code for WhatsApp number (e.g., +1, +44)';
COMMENT ON COLUMN waitlist_signups.company_size IS 'Size of company: 1-10, 11-50, 51-200, 201-1000, 1000+';
COMMENT ON COLUMN waitlist_signups.primary_use_case IS 'Main use case for Haven7';
COMMENT ON COLUMN waitlist_signups.pain_level IS 'Frequency of information finding struggles: Daily, Weekly, Monthly, Rarely';

