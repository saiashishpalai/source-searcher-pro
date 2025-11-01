# Haven7 Waitlist Setup Guide

## Overview
This document explains how to set up and use the Haven7 waitlist system for early access signups.

## Database Setup

### 1. Run the Schema Migration
Execute the waitlist schema SQL in your Supabase SQL editor:

```bash
# Copy the contents of database/schema/waitlist-schema.sql
# Paste into Supabase SQL Editor and execute
```

Or via Supabase CLI:

```bash
supabase db push
```

### 2. Verify RLS Policies
The schema creates the following security policies:
- ✅ Public can INSERT (anyone can sign up)
- ❌ Public cannot SELECT, UPDATE, or DELETE (admin only via dashboard)

### 3. Verify Table Structure
```sql
-- Check table exists
SELECT * FROM waitlist_signups LIMIT 1;

-- View table structure
\d waitlist_signups;
```

## Routes

### Public Routes
- `/waitlist` - Waitlist signup page
- Supports UTM parameters: `?utm_source=X&utm_medium=Y&utm_campaign=Z`

### Admin Routes
- `/admin/waitlist` - Admin dashboard (PIN: 9979)
  - View all signups
  - Search and filter
  - Export to CSV/JSON

## Admin Dashboard Access

### PIN Protection
The admin dashboard is protected by a 4-digit PIN:
- **PIN:** `9979`
- Stored in sessionStorage for browser session
- No server-side authentication required

### Features
1. **Total Count** - See total signups at a glance
2. **Search** - Filter by name, email, or company
3. **Sort** - By date (newest first), name, or company
4. **Export**
   - CSV format for Excel/Sheets
   - JSON format for programmatic access
5. **Responsive** - Works on mobile and desktop

## Form Fields

### Required Fields
- Full Name
- Email (validated, unique)
- Company Name
- Job Title / Position
- Company Size
- Primary Use Case
- Pain Level
- Agree to Contact (checkbox)

### Optional Fields
- WhatsApp Number (with country code)
- Expected Team Size

### Auto-Captured Fields
- UTM Source, Medium, Campaign (from URL parameters)
- User Agent (device/browser info)
- Timestamp

## Marketing Campaigns

### UTM Parameter Tracking
Track signup sources using UTM parameters:

```
/waitlist?utm_source=linkedin&utm_medium=social&utm_campaign=launch
/waitlist?utm_source=product_hunt&utm_medium=referral&utm_campaign=launch_week
```

### Exporting Data
1. Navigate to `/admin/waitlist`
2. Enter PIN: `9979`
3. Use search/filter to narrow results
4. Click **CSV** or **JSON** to export

## Database Schema

### Table: `waitlist_signups`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| full_name | TEXT | User's full name |
| email | TEXT | Unique email |
| company_name | TEXT | Company name |
| job_title | TEXT | Job title/position |
| whatsapp_number | TEXT | Optional WhatsApp |
| whatsapp_country_code | TEXT | Country code (default: +1) |
| company_size | TEXT | One of: 1-10, 11-50, 51-200, 201-1000, 1000+ |
| primary_use_case | TEXT | Main use case |
| pain_level | TEXT | One of: Daily, Weekly, Monthly, Rarely |
| expected_team_size | TEXT | Optional |
| agree_to_contact | BOOLEAN | Consent checkbox |
| utm_source | TEXT | Tracking |
| utm_medium | TEXT | Tracking |
| utm_campaign | TEXT | Tracking |
| user_agent | TEXT | Device info |
| created_at | TIMESTAMP | Signup time |

### Indexes
- `idx_waitlist_email` - Fast duplicate checks
- `idx_waitlist_created_at` - Fast sorting by date
- `idx_waitlist_company_size` - Analytics
- `idx_waitlist_primary_use_case` - Analytics

## Styling

The waitlist pages use Haven7's dark theme:
- Background: `#0f0f11`
- Cards: `#1f1f23`
- Accent: `#a855f7` (purple)
- Glass-morphism effects
- Smooth animations

## Troubleshooting

### "Duplicate email" error
- The email is already in the waitlist
- Database constraint prevents duplicates
- Shows user-friendly error message

### Admin dashboard won't load
- Clear sessionStorage
- Refresh page
- Re-enter PIN

### Missing data in exports
- Check search/filter settings
- Ensure data exists in database
- Verify Supabase connection

### RLS policy issues
- Verify policies in Supabase dashboard
- Check that RLS is enabled
- Ensure `anon` and `authenticated` roles exist

## Next Steps

1. ✅ Database schema created
2. ✅ Frontend pages implemented
3. ✅ Admin dashboard ready
4. 🔲 Run schema migration in production
5. 🔲 Test signup flow
6. 🔲 Set up email notifications (optional)
7. 🔲 Add to marketing site

## Future Enhancements

- [ ] Email confirmation on signup
- [ ] Referral code system
- [ ] Automatic analytics dashboard
- [ ] Integration with CRM (e.g., HubSpot)
- [ ] Automated welcome emails
- [ ] A/B testing different value propositions

## Support

For issues or questions:
1. Check this README
2. Review database schema
3. Check browser console for errors
4. Verify Supabase connection

