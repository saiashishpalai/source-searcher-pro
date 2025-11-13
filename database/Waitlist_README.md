# Haven7 Waitlist System

## Overview
Email-only waitlist signup system for Haven7 early access. Minimalist design with modern animations and glass-morphism effects.

## Database Setup

### Initial Setup
Run the schema in Supabase SQL Editor:

**File:** `database/schema/waitlist-schema.sql`

Or run directly:

```sql
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT DEFAULT '',
  company_name TEXT DEFAULT '',
  job_title TEXT DEFAULT '',
  whatsapp_number TEXT,
  whatsapp_country_code TEXT DEFAULT '+1',
  company_size TEXT NOT NULL DEFAULT 'Unknown',
  primary_use_case TEXT NOT NULL DEFAULT 'Unknown',
  pain_level TEXT NOT NULL DEFAULT 'Unknown',
  agree_to_contact BOOLEAN NOT NULL DEFAULT true,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_waitlist_email ON waitlist_signups(email);
CREATE INDEX idx_waitlist_created_at ON waitlist_signups(created_at DESC);

-- RLS
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public insert on waitlist_signups"
  ON waitlist_signups FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public select on waitlist_signups"
  ON waitlist_signups FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Deny public update on waitlist_signups"
  ON waitlist_signups FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "Deny public delete on waitlist_signups"
  ON waitlist_signups FOR DELETE TO anon, authenticated USING (false);

-- Permissions
GRANT SELECT, INSERT ON waitlist_signups TO anon;
GRANT SELECT, INSERT ON waitlist_signups TO authenticated;
```

## Routes

- **Public:** `/waitlist` - Email-only signup page
- **Admin:** `/admin/waitlist` - Dashboard (PIN: `9979`)

## Features

- ✅ Email-only signup (minimal friction)
- ✅ Modern animated hero design
- ✅ UTM parameter tracking
- ✅ Admin dashboard with PIN protection
- ✅ CSV/JSON export
- ✅ Responsive mobile design

## Admin Dashboard

**URL:** `/admin/waitlist`  
**PIN:** `9979`

Features:
- View all signups in sortable table
- Search by email, name, or company
- Export to CSV or JSON
- Responsive card view on mobile

## Form Fields

**Required:**
- Email address

**Auto-filled:**
- Full Name: `""` (empty string)
- Company Name: `""` (empty string)
- Job Title: `""` (empty string)
- Company Size: `"Unknown"`
- Primary Use Case: `"Unknown"`
- Pain Level: `"Unknown"`
- Agree to Contact: `true`
- User Agent (from browser)
- UTM parameters (from URL)

## Troubleshooting

### Form submission errors
1. Verify table exists: `SELECT * FROM waitlist_signups LIMIT 1;`
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'waitlist_signups';`
3. Refresh schema cache: `NOTIFY pgrst, 'reload schema';`

### Admin dashboard won't load
1. Clear browser sessionStorage
2. Refresh page
3. Re-enter PIN: `9979`

### Export not working
1. Check browser console for errors
2. Ensure data exists in table
3. Try refreshing the dashboard

## Security Notes

- Public can insert (anyone can sign up)
- Public can read (for admin dashboard - protected by PIN)
- Public cannot update or delete
- All fields except email use defaults/empty strings for email-only signup
