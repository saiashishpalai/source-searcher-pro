# Database Setup Order (Correct Sequence)

## ⚠️ Important: Run in This Exact Order

The wireframe feature requires the base PRD tables to exist first. Follow this sequence:

## Step 1: Run Base PRD Schema (If Not Already Done)

If you haven't set up the PRD tables yet, run this first:

```sql
-- Location: database/migrations/prd-builder-schema.sql
-- This creates: prd_versions, prd_sections, prd_source_refs tables
```

To check if you need this:
```sql
-- Run this to check if tables exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('prd_versions', 'prd_sections', 'prd_source_refs');

-- If it returns all 3 tables, skip to Step 2
-- If it returns nothing or fewer than 3 tables, run Step 1
```

### Run the Base Schema:

**Option A: Via Supabase SQL Editor**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `database/migrations/prd-builder-schema.sql`
3. Paste and click "Run"
4. Verify success (should see "Success. No rows returned")

**Option B: Via Supabase CLI**
```bash
supabase db push database/migrations/prd-builder-schema.sql
```

## Step 2: Add Wireframe Columns to Existing prd_sections Table

Now that `prd_sections` exists, add the wireframe columns:

```sql
-- Location: database/migrations/add-wireframe-columns.sql

-- Add wireframe_url column
ALTER TABLE prd_sections
ADD COLUMN IF NOT EXISTS wireframe_url TEXT;

-- Add wireframe_metadata column
ALTER TABLE prd_sections
ADD COLUMN IF NOT EXISTS wireframe_metadata JSONB DEFAULT '{}';

-- Add index for querying sections with wireframes
CREATE INDEX IF NOT EXISTS idx_prd_sections_wireframe 
ON prd_sections(prd_version_id) 
WHERE wireframe_url IS NOT NULL;

-- Add comment explaining the wireframe_metadata structure
COMMENT ON COLUMN prd_sections.wireframe_metadata IS 'JSON metadata containing: filename, size, uploaded_at, vision_analysis (components_detected, confidence_score)';
```

**To run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the SQL above (or use `database/migrations/add-wireframe-columns.sql`)
3. Paste and click "Run"
4. Verify: Should see "Success. No rows returned"

## Step 3: Create Wireframes Storage Bucket

### Part A: Create Bucket (SQL)

```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wireframes',
  'wireframes',
  true,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;
```

**To run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy the SQL above
3. Paste and click "Run"
4. Verify bucket exists: Go to Storage tab → Should see "wireframes" bucket

### Part B: Create Storage Policies (Via Dashboard)

⚠️ **Important:** Storage policies often fail via SQL with "must be owner" error.  
**Use the Supabase Dashboard UI instead:**

1. Go to **Storage** → **wireframes** bucket → **Policies** tab
2. Click **"New Policy"**
3. For quick testing, choose **"Allow all operations"** template
4. Set target roles to **authenticated**
5. Click "Save"

**OR** for fine-grained control, create 3 separate policies:

**Policy 1 - Upload:**
- Name: `Users can upload wireframes`
- Operation: `INSERT`
- Target: `authenticated`
- Policy: `bucket_id = 'wireframes' AND (storage.foldername(name))[1] = auth.uid()::text`

**Policy 2 - View:**
- Name: `Users can view their wireframes`
- Operation: `SELECT`
- Target: `authenticated`
- Policy: `bucket_id = 'wireframes' AND (storage.foldername(name))[1] = auth.uid()::text`

**Policy 3 - Delete:**
- Name: `Users can delete their wireframes`
- Operation: `DELETE`
- Target: `authenticated`
- Policy: `bucket_id = 'wireframes' AND (storage.foldername(name))[1] = auth.uid()::text`

**Alternative for Testing:** Skip policies entirely - the public bucket will work for testing. Add policies later for production security.

See `STORAGE_SETUP_FIX.md` for detailed instructions if you encounter policy errors.

## Verification Steps

After running all 3 steps, verify everything is set up correctly:

### Verify Tables
```sql
-- Check prd_sections has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'prd_sections' 
AND column_name IN ('wireframe_url', 'wireframe_metadata');

-- Expected output:
-- wireframe_url | text
-- wireframe_metadata | jsonb
```

### Verify Storage Bucket
```sql
-- Check bucket exists
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'wireframes';

-- Expected output:
-- wireframes | wireframes | true | 10485760
```

### Verify Storage Policies
```sql
-- Check RLS policies on storage
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%wireframe%';

-- Expected output: 4 policies (upload, view, update, delete)
```

## Quick Setup Script (All-in-One)

If you're starting fresh, run this complete script:

```sql
-- ================================
-- STEP 1: Base PRD Tables (if needed)
-- ================================
CREATE TABLE IF NOT EXISTS prd_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prd_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prd_version_id UUID REFERENCES prd_versions(id) ON DELETE CASCADE NOT NULL,
  section_id TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prd_version_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_prd_versions_user ON prd_versions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prd_sections_version ON prd_sections(prd_version_id, section_id);

ALTER TABLE prd_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies (using DO blocks to avoid errors if they exist)
DO $$ BEGIN
  CREATE POLICY "Users can view own PRDs" ON prd_versions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own PRDs" ON prd_versions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own PRDs" ON prd_versions
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own sections" ON prd_sections
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM prd_versions 
      WHERE id = prd_sections.prd_version_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own sections" ON prd_sections
    FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM prd_versions 
      WHERE id = prd_sections.prd_version_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own sections" ON prd_sections
    FOR UPDATE USING (EXISTS (
      SELECT 1 FROM prd_versions 
      WHERE id = prd_sections.prd_version_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================
-- STEP 2: Add Wireframe Columns
-- ================================
ALTER TABLE prd_sections
ADD COLUMN IF NOT EXISTS wireframe_url TEXT,
ADD COLUMN IF NOT EXISTS wireframe_metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_prd_sections_wireframe 
ON prd_sections(prd_version_id) 
WHERE wireframe_url IS NOT NULL;

COMMENT ON COLUMN prd_sections.wireframe_metadata IS 'JSON metadata containing: filename, size, uploaded_at, vision_analysis (components_detected, confidence_score)';

-- ================================
-- STEP 3: Create Storage Bucket
-- ================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wireframes',
  'wireframes',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DO $$ BEGIN
  CREATE POLICY "Users can upload wireframes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'wireframes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view their wireframes"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'wireframes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their wireframes"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'wireframes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their wireframes"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'wireframes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

## Troubleshooting

### Error: "relation prd_sections does not exist"
**Solution:** Run Step 1 first (base PRD schema)

### Error: "column wireframe_url already exists"
**Solution:** Skip Step 2, it's already done

### Error: "bucket wireframes already exists"
**Solution:** Skip Step 3, it's already done

### Error: "policy already exists"
**Solution:** Ignore, this is fine. The DO blocks prevent errors.

## Next Steps

After database setup is complete:
1. Restart your backend server
2. Restart your frontend
3. Test the feature at `/prd/new`
4. See `WIREFRAME_QUICKSTART.md` for testing instructions

---

**All database setup complete!** ✅

