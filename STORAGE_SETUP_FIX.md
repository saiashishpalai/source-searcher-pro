# Storage Bucket Setup - Permission Error Fix

## Problem

You got this error when trying to create storage policies via SQL:
```
ERROR: 42501: must be owner of table objects
```

This happens because storage policies need special permissions. Here's the fix:

## Solution: Create Policies via Supabase Dashboard

### Step 1: Create the Bucket (SQL - This worked)

The bucket creation worked, so this is already done:

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wireframes',
  'wireframes',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;
```

### Step 2: Verify Bucket Exists

Check in Supabase Dashboard:
1. Go to **Storage** (left sidebar)
2. You should see **wireframes** bucket listed
3. If you see it, proceed to Step 3

### Step 3: Create Policies via Dashboard (EASY!)

Since SQL policies failed, use the Supabase Dashboard UI instead:

1. **Go to Storage → wireframes bucket**
2. **Click on "Policies" tab**
3. **Click "New Policy"**

#### Policy 1: Upload Wireframes

```
Policy Name: Users can upload wireframes
Allowed operation: INSERT
Target roles: authenticated

Policy definition (USING expression):
bucket_id = 'wireframes' AND (storage.foldername(name))[1] = auth.uid()::text
```

Click "Review" then "Save policy"

#### Policy 2: View Wireframes

```
Policy Name: Users can view their wireframes
Allowed operation: SELECT
Target roles: authenticated

Policy definition (USING expression):
bucket_id = 'wireframes' AND (storage.foldername(name))[1] = auth.uid()::text
```

Click "Review" then "Save policy"

#### Policy 3: Delete Wireframes

```
Policy Name: Users can delete their wireframes
Allowed operation: DELETE
Target roles: authenticated

Policy definition (USING expression):
bucket_id = 'wireframes' AND (storage.foldername(name))[1] = auth.uid()::text
```

Click "Review" then "Save policy"

### Alternative: Simpler Public Policies (Quick Fix)

If you want to test the feature quickly without fine-grained permissions:

1. Go to **Storage → wireframes bucket → Policies**
2. Click **"New Policy"**
3. Choose **"Allow all operations"** template
4. Set target roles to **authenticated**
5. Save

This allows all authenticated users to upload/view/delete in the wireframes bucket (still secure because only authenticated users can access).

## Verification

After creating policies (either method), verify they exist:

```sql
-- Check policies on storage.objects
SELECT schemaname, tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%wireframe%';
```

You should see at least 3 policies listed.

## Alternative: Skip Policies Entirely (For Testing)

If you just want to test the feature quickly:

1. **Make the bucket public** (it already is)
2. **Skip the policies** - the bucket being public means anyone can access files (fine for testing)
3. **Test the feature** - uploads will work
4. **Add policies later** once you're ready for production

The feature will work without policies because:
- The bucket is public (can be accessed)
- Authenticated users can upload
- You can add policies later for production security

## What to Do Now

Choose one approach:

### Approach A: Use Dashboard (Recommended)
Follow Step 3 above to create 3 policies via UI

### Approach B: Test Without Policies (Quick)
Skip policies for now, test the feature, add them later

### Approach C: Simplified Policy
Create one "allow all" policy for authenticated users via dashboard

## Testing After Setup

Once you've chosen an approach:

1. **Restart services:**
```bash
cd server && npm run dev
# In another terminal:
npm run dev
```

2. **Test upload:**
   - Go to `http://localhost:8081/prd/new`
   - Fill in Steps 1-3
   - Upload a wireframe in Step 3
   - Should see preview thumbnail

3. **Test generation:**
   - Continue to Step 4
   - Click "Generate Requirements from Wireframe"
   - Should see requirements populate

## Full Database Setup Checklist

✅ Base PRD tables created (prd_versions, prd_sections)  
✅ Wireframe columns added (wireframe_url, wireframe_metadata)  
✅ Storage bucket created (wireframes)  
⚠️ Storage policies - **Choose approach above**

Once policies are set up, you're ready to use the feature!

---

**Quick Test Command:**

After setup, run this to verify everything:

```sql
-- Check tables exist
SELECT 'Tables' as check_type, count(*) as count 
FROM information_schema.tables 
WHERE table_name IN ('prd_versions', 'prd_sections')
UNION ALL
-- Check columns exist
SELECT 'Wireframe columns', count(*) 
FROM information_schema.columns 
WHERE table_name = 'prd_sections' 
AND column_name IN ('wireframe_url', 'wireframe_metadata')
UNION ALL
-- Check bucket exists
SELECT 'Storage bucket', count(*) 
FROM storage.buckets 
WHERE id = 'wireframes';
```

Expected output:
```
Tables            | 2
Wireframe columns | 2
Storage bucket    | 1
```

If all three show correct counts, you're ready to test! 🚀

