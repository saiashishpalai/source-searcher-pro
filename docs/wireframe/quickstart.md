# Wireframe Feature Quick Start

## 🚀 Get Started in 5 Minutes

### Step 0: Check if PRD Tables Exist (10 seconds)

Open your Supabase SQL Editor and check:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('prd_versions', 'prd_sections');
```

**If tables exist:** Skip to Step 1  
**If tables DON'T exist:** Run the base schema first:

```sql
-- Copy and run: database/migrations/prd-builder-schema.sql
-- This creates the PRD tables needed for the wireframe feature
```

See `DATABASE_SETUP_ORDER.md` for complete setup if starting fresh.

### Step 1: Setup Storage (30 seconds)

Open your Supabase SQL Editor and run:

```sql
-- Create wireframes bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wireframes',
  'wireframes',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies
CREATE POLICY "Users can upload wireframes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wireframes');

CREATE POLICY "Users can view wireframes"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'wireframes');

CREATE POLICY "Users can delete wireframes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'wireframes');
```

### Step 2: Run Database Migration (30 seconds)

Still in Supabase SQL Editor:

```sql
-- Add wireframe columns
ALTER TABLE prd_sections
ADD COLUMN IF NOT EXISTS wireframe_url TEXT,
ADD COLUMN IF NOT EXISTS wireframe_metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_prd_sections_wireframe 
ON prd_sections(prd_version_id) 
WHERE wireframe_url IS NOT NULL;
```

### Step 3: Verify Environment (10 seconds)

Check your `.env` file has:

```env
OPENAI_API_KEY=sk-...  # Must have GPT-4 access
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Step 4: Restart Services (1 minute)

```bash
# Restart backend
cd server && npm run dev

# In another terminal, restart frontend
npm run dev
```

### Step 5: Test It! (2 minutes)

#### Test 1: PRD Creation Flow

1. Go to `http://localhost:8081/prd/new`
2. Fill in Objective: "Build a login modal"
3. Fill in Background: "User authentication feature"
4. Fill in Scope: "Modal overlay with email/password inputs"
5. **Look for "Upload Wireframe (Optional)" section** ⬅️ NEW!
6. Upload a wireframe (or use a screenshot)
7. Click "Next" to Step 4 (Requirements)
8. **Click "Generate Requirements from Wireframe"** ⬅️ NEW!
9. Wait 10-20 seconds for AI analysis
10. See detailed requirements appear in the textarea!

#### Test 2: Edit Existing PRD

1. Open any existing PRD
2. Click "Edit" button
3. Scroll to Requirements section
4. Click the edit icon on Requirements
5. **Switch to "Generate from Wireframe" tab** ⬅️ NEW!
6. Upload a wireframe
7. Click "Generate Requirements"
8. Review generated content
9. Click "Replace All" or "Insert Below"
10. Click "Save"

## 🎯 Quick Test with Sample Wireframe

Don't have a wireframe handy? Use this:

1. Open any drawing app (even MS Paint)
2. Draw a simple box with these labels:
   - Top: "Login Modal"
   - Inside: "Email" input
   - Inside: "Password" input
   - Bottom: "Login" button, "Cancel" button
3. Save as PNG
4. Upload and test!

Expected output should include:
- Functional Requirements (FR-1, FR-2, etc.)
- Detailed UI specs for each component (Email input, Password input, Login button, Cancel button)
- States (default, hover, error, loading)
- Non-functional requirements (security, accessibility)

## 🐛 Troubleshooting

### "Bucket not found" error
Run Step 1 again. The bucket needs to exist.

### Generation fails
- Check OpenAI API key has GPT-4 access
- Check console for detailed error
- Try a clearer wireframe image

### Upload fails
- Check file is PNG/JPG/PDF
- Check file is under 10MB
- Check browser console for errors

### Low confidence (<70%)
This is normal for:
- Blurry wireframes
- Hand-drawn sketches without labels
- Minimal context (empty objective/background)

Solutions:
- Add more detail to your wireframe
- Fill in Objective/Background/Scope thoroughly
- Use clearer images

## 📊 What to Expect

### Confidence Scores
- **85-100%**: Excellent! Clear wireframe with good context
- **70-84%**: Good. Minor review needed
- **50-69%**: Okay. Significant review needed
- **<50%**: Poor. Consider re-uploading with better image

### Generation Time
- Simple wireframe: 10-15 seconds
- Complex wireframe: 20-30 seconds
- Multiple components: 30-45 seconds

### Output Quality
The AI will generate:
- 3-10 Functional Requirements
- Detailed specs for each visible UI component
- Default, hover, active, disabled, loading, error states
- Exact button labels and text from wireframe
- 5-8 Non-Functional Requirements

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Upload shows preview thumbnail
- ✅ "Generate Requirements" button appears
- ✅ Spinner shows during analysis
- ✅ Toast shows confidence score
- ✅ Requirements textarea populates with markdown
- ✅ Generated content includes FR-1, FR-2, component specs, NFR-1, etc.

## 📚 Next Steps

Once basic testing works:
1. Try different wireframe types (hand-drawn, Figma, whiteboard)
2. Test with existing PRDs
3. Compare Replace vs Insert actions
4. Test error cases (oversized file, invalid format)
5. Read full docs: `docs/WIREFRAME_SETUP.md`

## 💡 Pro Tips

1. **Better Results**: Add annotations to your wireframe (arrows, labels, notes)
2. **Context Matters**: Fill in Objective/Background/Scope for better output
3. **Iterate**: Generate → Edit → Regenerate for best results
4. **Save Often**: Use auto-save (every 2 seconds)
5. **Confidence Check**: <70% means review carefully before using

---

**Total setup time**: ~5 minutes
**Total test time**: ~2 minutes per flow
**You're ready to go!** 🚀

