# PRD Edit View Enhancements

## Overview
Added voice input and AI enhancement capabilities to the PRD edit view (`/prd/{id}`), completing the content creation and editing cycle.

## Features Added

### 1. Voice Input (Mic Capture)
- **Location**: Available in all section editors when in edit mode
- **Functionality**:
  - Click "Voice" button to start recording
  - Speak your content naturally
  - Click "Stop" to end recording
  - Audio is automatically transcribed using OpenAI Whisper
  - Transcript is inserted or replaces content based on mode
- **Permissions**: Requires microphone access (browser will prompt)

### 2. AI-Enhanced Drafting ("Improve with AI")
- **Location**: Available in all section editors when in edit mode
- **Functionality**:
  - Click "Improve with AI" button
  - AI analyzes the entire PRD context (Objective, Background, Scope, Requirements)
  - Generates an enhanced, detailed draft for the current section
  - Uses GPT-4 with section-specific prompts
  - Maintains consistency with the rest of the PRD

### 3. Insert/Replace Mode Toggle
- **Location**: Top-right of editor toolbar
- **Modes**:
  - **Replace**: AI-generated or voice transcribed content replaces the entire section
  - **Insert**: New content is appended below existing content
- **Use Case**: 
  - Use "Replace" for complete rewrites
  - Use "Insert" to add new information while keeping existing content

## User Interface

### Editor Toolbar (appears when editing any section)
```
┌──────────────────────────────────────────────────────────────┐
│ [🎤 Voice] [✨ Improve with AI]     [🔄 Replace] [➕ Insert] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  (Textarea for editing content)                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Visual States
- **Recording**: Voice button turns red with "Stop" label
- **Transcribing**: Shows spinner with "Transcribing..." text
- **Generating AI**: Shows spinner with "Generating..." text
- **Active Mode**: Replace/Insert toggle shows selected mode highlighted

## Technical Implementation

### Frontend
- **File**: `src/pages/PRDView.tsx`
- **New State**:
  - `isRecording`: Tracks mic recording state
  - `isTranscribing`: Tracks transcription in progress
  - `isGeneratingDraft`: Tracks AI generation in progress
  - `draftMode`: 'insert' | 'replace'
  - `currentEditingSection`: Which section is being edited
- **Functions**:
  - `startRecording(sectionId)`: Starts mic capture
  - `stopRecording()`: Stops and processes recording
  - `transcribeAudio(audioBlob, sectionId)`: Sends to backend
  - `generateAIDraft(sectionId)`: Calls AI generation endpoint

### Backend
- **File**: `server/index.js`
- **New Endpoint**: `POST /api/prd/generate-section-draft`
  - Accepts: `{ section_id, context }`
  - Returns: `{ draft, confidence }`
  - Uses GPT-4o-mini with section-specific system prompts
- **Existing Endpoint**: `POST /api/speech/transcribe`
  - Already existed for PRD creation flow
  - Reused for PRD edit flow

### API Client
- **File**: `src/lib/api-client.ts`
- **New Methods**:
  - `ApiClient.transcribeAudio(formData)`: Sends audio for transcription
  - `ApiClient.generateSectionDraft(sectionId, context)`: Generates AI draft

## Sections Enhanced

All 14 PRD sections now support voice input and AI enhancement:
1. Objective
2. Background
3. Scope
4. Requirements (also has wireframe tab)
5. Success Metrics
6. Access Permissions
7. Notifications
8. Reporting
9. Analytics Events
10. Filters
11. Dependencies
12. Backward Compatibility
13. Release Plan
14. Timeline

## Requirements Section - Special Case

The Requirements section has **three tabs** when editing:
1. **Manual Edit**: Traditional text editing with voice + AI toolbar
2. **Generate from Wireframe**: Upload wireframe image for automated generation
3. Both tabs share the same Insert/Replace mode toggle

## User Flow Examples

### Example 1: Enhance Timeline Section with Voice
1. Navigate to PRD view page (`/prd/{id}`)
2. Click "Edit" in sidebar
3. Scroll to "Timeline" section
4. Click "Voice" button in toolbar
5. Speak: "Phase 1 is design and planning for 2 weeks, Phase 2 is development for 6 weeks..."
6. Click "Stop"
7. Wait for transcription
8. Edit as needed
9. Click "Save v2"

### Example 2: Generate Success Metrics with AI
1. Navigate to PRD view page
2. Click "Edit"
3. Scroll to "Success Metrics" section
4. Ensure "Replace" mode is selected
5. Click "Improve with AI"
6. AI analyzes Objective, Background, Scope, Requirements
7. Generates quantifiable KPIs and metrics
8. Review and edit the generated content
9. Click "Save v2"

### Example 3: Add Context to Background (Insert Mode)
1. Edit existing PRD
2. Scroll to "Background" section (already has content)
3. Switch to "Insert" mode
4. Click "Voice" and speak additional context
5. New content is appended below existing content
6. Save changes

## Error Handling

- **Mic Access Denied**: Toast notification prompts user to allow microphone
- **Transcription Failed**: Error toast with retry suggestion
- **AI Generation Failed**: Error toast, existing content preserved
- **Network Errors**: Standard error handling with user feedback

## Consistency with PRD Creation Flow

These features mirror the PRD creation wizard (`/prd/new`):
- Same voice transcription API
- Same AI generation logic (but adapted for single-section enhancement)
- Same Insert/Replace mode toggle
- Consistent UI/UX patterns

## Future Enhancements (Not in Scope)

- Real-time collaborative editing
- Inline AI suggestions (like Copilot)
- Voice commands ("Replace this paragraph", "Add a bullet point")
- Multi-language transcription
- Custom AI writing style preferences

## Testing Checklist

### Voice Input
- [ ] Mic permission prompt appears
- [ ] Recording starts/stops correctly
- [ ] Transcription completes successfully
- [ ] Content is inserted in correct section
- [ ] Replace mode overwrites existing content
- [ ] Insert mode appends to existing content

### AI Enhancement
- [ ] AI generation button disabled during processing
- [ ] Generated content is contextually relevant
- [ ] Section-specific formatting is correct (e.g., FR-X for Requirements)
- [ ] Long content doesn't break UI
- [ ] Error states handled gracefully

### UI/UX
- [ ] Toolbar renders on all sections
- [ ] Active mode toggle is visible
- [ ] Loading states are clear
- [ ] Toast notifications appear for success/error
- [ ] Tooltips show helpful hints

### Cross-Browser
- [ ] Works in Chrome
- [ ] Works in Safari
- [ ] Works in Firefox
- [ ] Mobile responsive (if applicable)

## Known Limitations

1. Voice recording requires browser support for `MediaRecorder API`
2. Transcription requires OpenAI API key (env variable)
3. AI generation limited to 2000 tokens per section (configurable)
4. No offline support for voice or AI features
5. Single user editing at a time (no real-time collaboration)

## Configuration

### Environment Variables
```bash
# Required for voice transcription
OPENAI_API_KEY=sk-...

# Required for Supabase auth
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Backend Configuration
- Max audio file size: 10MB (multer config in `server/index.js`)
- AI model: `gpt-4o-mini` (can be changed to `gpt-4` for better quality)
- Max tokens: 2000 per section
- Temperature: 0.7 (balanced creativity)

## Support

For issues or feature requests, please contact the development team or create an issue in the repository.

