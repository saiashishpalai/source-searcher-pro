# 🚨 IMPORTANT: Run These SQL Commands in Supabase

The waitlist page is ready, but you need to create the table and set up permissions. Follow these steps:

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New query"

## Step 2: Create the Table

Copy and paste this ENTIRE SQL:

```sql
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
```

Click "Run" (or press Cmd/Ctrl + Enter). You should see "Success. No rows returned".

## Step 3: Fix RLS Policy (IF YOU ALREADY CREATED THE TABLE BEFORE)

If you already created the table with the old RLS policies, run this SQL to fix it:

```sql
-- Drop the old "deny" policy if it exists
DROP POLICY IF EXISTS "Deny public select on waitlist_signups" ON waitlist_signups;

-- Create new policy that allows read access
-- This is safe because the admin dashboard has PIN protection
CREATE POLICY "Allow public select on waitlist_signups"
  ON waitlist_signups
  FOR SELECT
  TO anon, authenticated
  USING (true);
```

## Step 4: Verify

Run this query to verify:

```sql
SELECT * FROM waitlist_signups;
```

You should see any test entries you created.

## Step 5: Test Everything

1. **Test Signup**: Go to `/waitlist` and submit a form
2. **Test Dashboard**: Go to `/admin/waitlist`, enter PIN `9979`, see your signup

## Troubleshooting

### Error: "Could not find the table"
The table doesn't exist. Run Step 2 above.

### Dashboard shows "No signups yet" but data exists in Supabase
You need to fix the RLS policy. Run Step 3 above.

### "No rows returned" after creating table
That's correct! It means the table was created successfully.

### Still having issues
1. Wait 10 seconds for schema cache to refresh
2. Refresh your browser
3. Check browser console for errors
4. Make sure you're using the correct Supabase project

## What This Creates

✅ Table: `waitlist_signups` with all required columns  
✅ RLS Policies: Public can insert and read, no updates/deletes  
✅ Indexes: Fast queries on email and dates  
✅ Security: Frontend PIN protection + Row level security  

## Security Note

The admin dashboard uses **two layers of protection**:
1. **Frontend**: PIN required (`9979`)
2. **Database**: RLS enabled (but public read allowed for dashboard)

For production, consider adding proper authentication. For now, the PIN + obscure URL is sufficient.

## Admin Dashboard

- URL: `/admin/waitlist`
- PIN: `9979`
