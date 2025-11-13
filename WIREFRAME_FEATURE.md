# Sketch-to-Requirements Feature

## Overview

The Sketch-to-Requirements feature allows users to upload wireframe images (hand-drawn sketches, whiteboard photos, Figma screenshots) and automatically generate detailed Requirements sections for their PRDs using GPT-4 Vision.

## Key Features

- **Upload Support**: PNG, JPG, PDF files up to 10MB
- **Two User Flows**:
  1. **During PRD Creation**: Upload in Step 3 (Scope), generate in Step 4 (Requirements)
  2. **Editing Existing PRDs**: Upload and generate in the Requirements edit modal
- **AI-Powered Analysis**: Uses GPT-4 Vision to extract UI components, user flows, and interactions
- **Confidence Scoring**: Each generation includes a 0-100% confidence score
- **Context-Aware**: Incorporates existing PRD content and RAG-retrieved chunks
- **Flexible Output**: Replace existing requirements or insert generated content

## Implementation Details

### Architecture

```
┌─────────────────┐
│  Frontend (TS)  │
│  - PRDNew.tsx   │  Upload wireframe in Step 3
│  - PRDView.tsx  │  Edit Requirements with wireframe
│  - WireframeUp  │  Reusable upload component
│    load.tsx     │
└────────┬────────┘
         │ API calls
         ▼
┌─────────────────┐
│  Backend (JS)   │
│  - index.js     │  POST /api/prd/generate-requirements-from-wireframe
│                 │  POST /api/prd/regenerate-requirements-from-wireframe
│  - wireframe-   │  GPT-4 Vision service with confidence scoring
│    analysis-    │
│    service.js   │
└────────┬────────┘
         │ Vision API
         ▼
┌─────────────────┐
│  OpenAI GPT-4   │  Analyzes wireframe + context
│  Vision API     │  Generates detailed Requirements
└─────────────────┘
```

### Database Schema

Added to `prd_sections` table:
- `wireframe_url` (TEXT): Supabase Storage URL
- `wireframe_metadata` (JSONB): Upload metadata + analysis results

```sql
ALTER TABLE prd_sections
ADD COLUMN wireframe_url TEXT,
ADD COLUMN wireframe_metadata JSONB DEFAULT '{}';
```

### Storage

- **Bucket**: `wireframes` (public, 10MB limit)
- **Path**: `wireframes/{user_id}/{timestamp}.{ext}`
- **RLS**: Users can only access their own wireframes
- **Setup**: See `docs/WIREFRAME_SETUP.md`

### API Endpoints

#### 1. Generate Requirements (New PRD)

```
POST /api/prd/generate-requirements-from-wireframe
Authorization: Bearer {token}

{
  "wireframe": "base64-encoded-image",
  "context": {
    "objective": "...",
    "background": "...",
    "scope": "..."
  },
  "retrievedChunks": [...]
}

Response:
{
  "requirements": "**4. Requirements**\n\n### A. Functional Requirements...",
  "confidence": 85,
  "metadata": {
    "components_detected": 5,
    "has_functional_requirements": true,
    "word_count": 452
  }
}
```

#### 2. Regenerate Requirements (Existing PRD)

```
POST /api/prd/regenerate-requirements-from-wireframe
Authorization: Bearer {token}

{
  "prdId": "uuid",
  "wireframe": "base64-encoded-image",
  "existingPRD": {
    "objective": "...",
    "requirements": "..."
  }
}

Response: Same as above
```

### Generated Requirements Format

```markdown
**4. Requirements**

### A. Functional Requirements
- FR-1: High-level capability
- FR-2: High-level capability

### B. Detailed UI/UX Specification

#### **Component Name**
**Visual Placement:** Where it appears on screen
**UI Elements:** All buttons, inputs, labels visible
**User Interaction:** Click/tap/keyboard behavior
**States:** Default, hover, active, disabled, loading, error
**Copy:** "Button Text", "Label", "Error: Invalid input"
**Validation:** Rules and error messages

### C. Non-Functional Requirements
- NFR-1: Performance targets
- NFR-2: Security requirements
- NFR-3: Accessibility requirements
```

## User Flows

### Flow 1: PRD Creation

1. User navigates to `/prd/new`
2. Fills Steps 1-2 (Objective, Background)
3. **Step 3 (Scope)**: Sees "Upload Wireframe (Optional)" section
4. Uploads wireframe (drag-drop or click)
5. Proceeds to Step 4 (Requirements)
6. **Step 4**: Sees wireframe preview with "Generate Requirements from Wireframe" button
7. Clicks button → AI analyzes → Requirements populated in textarea
8. User can edit generated requirements
9. On save, wireframe URL + metadata saved to database

### Flow 2: Edit Existing PRD

1. User opens PRD at `/prd/{id}`
2. Clicks "Edit" button
3. Clicks edit icon on Requirements section
4. Modal opens with two tabs: "Manual Edit" | "Generate from Wireframe"
5. Switches to "Generate from Wireframe" tab
6. Uploads wireframe
7. Clicks "Generate Requirements"
8. Reviews generated content with confidence badge
9. Chooses action:
   - **Replace All**: Overwrites existing requirements
   - **Insert Below**: Appends with separator
   - **Cancel**: Discards generation
10. Clicks "Save" to persist changes

## Confidence Scoring

The system assesses confidence (0-100%) based on:
- ✅ Structured sections present (Functional, UI/UX, Non-Functional)
- ✅ Number of components detected
- ✅ Presence of exact UI copy
- ✅ States documented (default, loading, error, etc.)
- ✅ User flows identified
- ✅ Context utilization (matches objective/background)
- ✅ RAG chunks referenced
- ❌ Very short output (<100 words)

**Thresholds:**
- **≥70%**: High confidence (green badge)
- **50-69%**: Medium confidence (amber badge)
- **<50%**: Low confidence (red badge) + warning toast

## Analytics Events

Tracked via `src/lib/analytics.ts`:
- `wireframe_uploaded`: File size, type
- `wireframe_removed`: Timestamp
- `wireframe_generation_started`: Context/chunks available
- `requirements_generated`: Confidence, word count, components detected
- `wireframe_generation_failed`: Error message

## Error Handling

### Upload Errors
- **Unsupported format**: Toast with accepted formats
- **File too large**: Toast with size limit
- **Storage unavailable**: Falls back to base64 (no persistence)

### Generation Errors
- **API timeout**: Retry with exponential backoff
- **Invalid image**: Toast explaining issue
- **Low confidence (<70%)**: Warning toast recommending review
- **Rate limit**: Clear error message with retry suggestion

## Testing

### Manual Testing Checklist

**Upload Flow:**
- [ ] Upload PNG wireframe
- [ ] Upload JPG wireframe
- [ ] Upload PDF wireframe
- [ ] Upload oversized file (expect error)
- [ ] Upload invalid format (expect error)
- [ ] Drag-and-drop upload
- [ ] Remove uploaded wireframe

**Generation Flow:**
- [ ] Generate from hand-drawn sketch
- [ ] Generate from Figma screenshot
- [ ] Generate from whiteboard photo
- [ ] Generate with minimal context (empty objective/background)
- [ ] Generate with rich context
- [ ] Generate for existing PRD with requirements

**UI/UX:**
- [ ] Loading states display correctly
- [ ] Confidence badge colors match thresholds
- [ ] Toast notifications appear
- [ ] Replace/Insert actions work correctly
- [ ] Auto-save persists wireframe metadata

**Edge Cases:**
- [ ] Unreadable/blurry wireframe
- [ ] Empty wireframe (blank image)
- [ ] Multiple consecutive generations
- [ ] Cancel mid-generation

## Files Changed

### New Files
- `src/components/WireframeUpload.tsx` - Reusable upload component
- `src/lib/analytics.ts` - Analytics tracking helper
- `server/services/wireframe-analysis-service.js` - GPT-4 Vision service
- `database/migrations/add-wireframe-columns.sql` - DB migration
- `database/schema/wireframes-storage-bucket.sql` - Storage setup
- `docs/WIREFRAME_SETUP.md` - Setup guide

### Modified Files
- `src/pages/PRDNew.tsx` - Added upload in Step 3, generation in Step 4
- `src/pages/PRDView.tsx` - Added wireframe tab in Requirements edit modal
- `src/lib/api-client.ts` - Added 3 new API methods
- `src/integrations/supabase/types.ts` - Added wireframe columns to types
- `server/index.js` - Added 2 new endpoints + wireframe service init

## Setup Instructions

See [`docs/WIREFRAME_SETUP.md`](./docs/WIREFRAME_SETUP.md) for detailed setup steps including:
1. Creating the Supabase storage bucket
2. Running database migrations
3. Configuring environment variables
4. Testing the feature

## Cost Considerations

- **Storage**: ~$0.021/GB/month (Supabase)
- **GPT-4 Vision API**: ~$0.10-0.30 per wireframe analysis
- **Average PRD**: 1 wireframe = $0.10-0.30
- **Heavy usage**: 100 wireframes/month = $10-30/month

## Future Enhancements

1. **Multi-Screen Support**: Upload multiple wireframes for a single PRD
2. **Interactive Annotation**: Draw/annotate on wireframe before generation
3. **Design System Mapping**: Auto-detect components from existing design system
4. **Figma Plugin**: Direct import from Figma
5. **Version Comparison**: Compare requirements across wireframe versions
6. **Batch Processing**: Generate requirements for multiple screens at once

## Support

For issues or questions:
1. Check `docs/WIREFRAME_SETUP.md` for setup troubleshooting
2. Review console logs for detailed error messages
3. Verify OpenAI API key has GPT-4 Vision access
4. Ensure Supabase storage bucket is configured correctly

