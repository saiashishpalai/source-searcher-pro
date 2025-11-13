# Wireframe Upload Setup Guide

This guide covers the setup requirements for the Sketch-to-Requirements feature.

## Supabase Storage Bucket Setup

The wireframe upload feature requires a Supabase Storage bucket named `wireframes`.

### Creating the Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `wireframes`
   - **Public bucket**: ✓ Yes (images need to be accessible for GPT-4 Vision)
   - **File size limit**: 10 MB (recommended)
   - **Allowed MIME types**: `image/png`, `image/jpeg`, `image/jpg`, `application/pdf`

### SQL Setup (Alternative)

You can also create the bucket via SQL:

```sql
-- Create wireframes storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('wireframes', 'wireframes', true);

-- Add RLS policy to allow authenticated users to upload
CREATE POLICY "Users can upload wireframes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wireframes');

-- Add RLS policy to allow authenticated users to view their own wireframes
CREATE POLICY "Users can view their wireframes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'wireframes');

-- Add RLS policy to allow authenticated users to delete their own wireframes
CREATE POLICY "Users can delete their wireframes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wireframes');
```

## Database Migration

Run the database migration to add wireframe columns to the `prd_sections` table:

```bash
# The migration file is located at:
# database/migrations/add-wireframe-columns.sql

# Apply it via Supabase CLI:
supabase db push

# Or run it manually in the Supabase SQL editor
```

## Environment Variables

Ensure the following environment variables are set:

```env
# Required for GPT-4 Vision API
OPENAI_API_KEY=sk-...

# Supabase configuration (already set)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Testing the Feature

### 1. Test Upload in PRD Creation Flow

1. Navigate to `/prd/new`
2. Fill in Steps 1-2 (Objective, Background)
3. In Step 3 (Scope), you'll see an "Upload Wireframe (Optional)" section
4. Upload a wireframe image (PNG, JPG, or PDF)
5. Proceed to Step 4 (Requirements)
6. You'll see a "Generate Requirements from Wireframe" button
7. Click it to generate detailed requirements

### 2. Test Upload in PRD Edit Flow

1. Open an existing PRD (`/prd/{id}`)
2. Click "Edit" button
3. Scroll to the Requirements section
4. Click the edit icon on the Requirements section
5. Switch to the "Generate from Wireframe" tab
6. Upload a wireframe and click "Generate Requirements"
7. Review the generated content and choose "Replace All", "Insert Below", or "Cancel"

## Troubleshooting

### "Bucket not found" Error

If you see this error, the `wireframes` bucket doesn't exist. Follow the setup steps above.

The feature will still work with base64 fallback, but images won't be persisted to storage.

### GPT-4 Vision API Errors

- **"Model not found"**: Ensure you're using `gpt-4o` (GPT-4 with vision support)
- **"Invalid image format"**: Check that the uploaded file is a valid PNG, JPG, or PDF
- **Rate limit exceeded**: Implement exponential backoff or upgrade your OpenAI plan

### Low Confidence Scores

If generated requirements have low confidence (<70%):
- Ensure the wireframe is clear and high-resolution
- Add more context in Objective/Background/Scope fields
- Try uploading a different wireframe with better annotations

## Analytics

The feature tracks the following events:
- `wireframe_uploaded`: When a user uploads a wireframe
- `wireframe_removed`: When a user removes a wireframe
- `wireframe_generation_started`: When generation begins
- `requirements_generated`: When generation succeeds (with confidence score)
- `wireframe_generation_failed`: When generation fails (with error message)

These are currently logged to console. To enable full analytics:

1. Install PostHog, Mixpanel, or your preferred analytics provider
2. Update `src/lib/analytics.ts` to send events to your provider
3. Set `VITE_ENABLE_ANALYTICS=true` in your `.env` file

## Performance Considerations

- **File size**: Limit uploads to 10MB (configurable in `WireframeUpload.tsx`)
- **API latency**: GPT-4 Vision analysis can take 10-30 seconds for detailed requirements
- **Cost**: Each wireframe analysis costs ~$0.10-0.30 (varies by image size and detail level)

## Future Enhancements

See the implementation plan (`wire.plan.md`) for potential future features:
- Multi-screen wireframe support
- Interactive wireframe annotation
- Design system mapping
- Figma plugin integration
- Version comparison

