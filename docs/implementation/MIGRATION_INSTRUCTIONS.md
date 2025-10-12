# Database Migration Instructions

## 🚨 CRITICAL: Run This in Supabase SQL Editor

**You MUST run the `database-migration.sql` file in your Supabase SQL Editor to fix the OAuth issue.**

## Steps:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the Migration**
   - Copy the entire contents of `database-migration.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute the migration

3. **Verify Success**
   - The script will show "Migration completed successfully" if it works
   - You should see the table structure with the new columns
   - Sample data should show the updated records

## What This Migration Does:

✅ **Adds missing columns**: `source_user_id`, `created_at`, `updated_at`
✅ **Creates proper trigger**: Auto-updates `updated_at` on record changes
✅ **Adds unique constraint**: Prevents duplicate connections per user/source
✅ **Updates existing data**: Populates new columns with appropriate values
✅ **Creates backup**: `user_connections_backup` table for safety
✅ **Sets up RLS policies**: Proper security policies for the table

## Expected Result:

After running this migration, the Google OAuth flow should work without the `updated_at` error, and the UI should correctly show `googleDrive: true` after successful authentication.

## If Something Goes Wrong:

The script creates a backup table (`user_connections_backup`) with your original data. If needed, you can restore from this backup.

---

**⚠️ IMPORTANT: Run this migration BEFORE testing the OAuth flow again!**
