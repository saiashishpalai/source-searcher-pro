# Testing Guide: AI Draft Generation (Phase 2, Step 2)

## Overview
Test the new "Draft from Context" feature that generates PRD section drafts using GPT-4, grounded in retrieved document chunks.

---

## What to Test

### 1. **Draft Generation Flow**
- Generate draft from context suggestions
- Generate draft from pinned chunks
- Generate draft from both pinned + suggestions
- Insert vs Replace mode toggle

### 2. **Context Preprocessing**
- Deduplication of similar chunks (>70% overlap)
- Chunk trimming (first 500 chars)
- Relevance sorting (recency + retrieval score)

### 3. **Deterministic Style**
- Consistent tone across multiple drafts
- Proper formatting (short paragraphs, bullet points)
- Citation format [1], [2], etc.

### 4. **Citation Tracking**
- Citations stored when draft is generated
- Citations persist through auto-save
- Citations saved to `prd_source_refs` table

### 5. **Error Handling**
- No chunks available
- OpenAI quota exceeded
- Network errors
- Invalid PRD/section IDs

---

## How to Test (Step-by-Step)

### Prerequisites
1. ✅ Backend server running on `https://localhost:8085`
2. ✅ Frontend dev server running on `https://localhost:8081`
3. ✅ Logged in with valid Supabase auth
4. ✅ Have documents synced (Slack, Notion, or Google Drive)

---

### Test 1: Basic Draft Generation

**Steps:**
1. Navigate to `/prds` → Click "Create PRD"
2. Enter a title: "Test PRD for Draft Generation"
3. On Question 1 (Objective), start typing in the textarea:
   ```
   We need to improve user onboarding
   ```
4. Wait 2-3 seconds for context suggestions to appear
5. Verify you see:
   - ✅ "Searching..." indicator
   - ✅ BM25 results appear immediately (~300ms)
   - ✅ "Refining results with AI..." indicator
   - ✅ Hybrid results update silently (~2-3s later)

**Expected:**
- Context suggestions appear with document titles, sources, and snippets
- "Draft from Context" button appears above textarea
- Insert/Replace toggle appears next to the button

---

### Test 2: Generate Draft (Insert Mode)

**Steps:**
1. Ensure "Insert" mode is selected (default)
2. Type some existing text in the textarea:
   ```
   User onboarding is currently too complex.
   ```
3. Click "Draft from Context" button
4. Wait for generation (5-10 seconds)

**Expected:**
- ✅ Loading spinner appears ("Generating...")
- ✅ Draft appears below existing text with separator `---`
- ✅ Draft starts with a summary line
- ✅ Draft uses short paragraphs and bullet points
- ✅ Citations appear as [1], [2], etc.
- ✅ Console shows: `✅ Draft generated • X citations added • insert mode`

**Verify Draft Quality:**
- ✅ Professional, structured writing
- ✅ Grounded in context (mentions relevant details from documents)
- ✅ Section-specific (for Objective: problem statement, pain points, goals)
- ✅ No fabricated metrics or dependencies

---

### Test 3: Generate Draft (Replace Mode)

**Steps:**
1. Click "Replace" mode toggle
2. Type existing text in textarea:
   ```
   Old content that should be replaced
   ```
3. Click "Draft from Context"
4. Wait for generation

**Expected:**
- ✅ Existing text is completely replaced
- ✅ No separator `---`
- ✅ Draft is the only content in textarea
- ✅ Console shows: `✅ Draft generated • X citations added • replace mode`

---

### Test 4: Draft from Pinned Chunks

**Steps:**
1. Wait for context suggestions to appear
2. Click the "Pin" icon (📌) on 2-3 chunks
3. Verify chunks show "Pinned" badge
4. Click "Draft from Context"

**Expected:**
- ✅ Draft uses pinned chunks + top suggestions
- ✅ Pinned chunks are prioritized in the draft
- ✅ Citations include pinned chunk IDs

---

### Test 5: Citation Tracking & Persistence

**Steps:**
1. Generate a draft (any section)
2. Wait for auto-save (2 seconds)
3. Check browser DevTools → Network tab
4. Look for `POST /api/prd/sections` request

**Expected:**
- ✅ Request includes `citation_chunk_ids` array
- ✅ Citations are non-empty
- ✅ Citations persist when navigating away and back

**Verify in Database:**
```sql
-- Check if citations were stored
SELECT * FROM prd_source_refs 
WHERE prd_version_id = '<your-prd-id>'
ORDER BY created_at DESC;
```

---

### Test 6: Context Preprocessing

**Steps:**
1. Generate multiple drafts with overlapping context
2. Check console logs for preprocessing steps

**Expected:**
- ✅ Similar chunks (>70% overlap) are deduplicated
- ✅ Chunks trimmed to 500 characters
- ✅ Chunks sorted by relevance + recency
- ✅ Maximum 8 chunks sent to GPT

**Verify in Network Tab:**
- Request to `/api/prd/sections/suggest` includes `chunk_ids` array
- Chunk IDs match pinned + top suggestions

---

### Test 7: All 5 Sections

**Steps:**
1. Test draft generation for each section:
   - **Objective**: Problem statement, pain points
   - **Scope**: In/out boundaries, MVP features
   - **Metrics**: KPIs, success criteria
   - **Dependencies**: Blockers, constraints
   - **Timeline**: Milestones, deadlines

**Expected:**
- ✅ Each section generates appropriate content
- ✅ Section-specific prompts are used
- ✅ Drafts are contextually relevant to section type

---

### Test 8: Error Handling

#### 8a. No Chunks Available

**Steps:**
1. Navigate to a new question
2. Type text but don't wait for suggestions
3. Click "Draft from Context" immediately

**Expected:**
- ✅ Alert: "Please search and select context first, or pin some chunks."
- ✅ Button is disabled if no chunks available

#### 8b. OpenAI Quota Exceeded

**Steps:**
1. (Simulate by temporarily breaking API key)
2. Generate draft

**Expected:**
- ✅ Error message: "OpenAI quota exceeded. Please try again later."
- ✅ User-friendly error, not technical stack trace

#### 8c. Network Error

**Steps:**
1. Stop backend server
2. Try to generate draft

**Expected:**
- ✅ Error message: "Failed to generate draft. Please try again."
- ✅ No crash, UI remains functional

---

### Test 9: Multiple Drafts (Style Consistency)

**Steps:**
1. Generate draft for Objective section
2. Clear textarea
3. Generate draft again (same section, same context)

**Expected:**
- ✅ Both drafts have similar tone and structure
- ✅ Consistent formatting (short paragraphs, bullets)
- ✅ Both start with summary line
- ✅ Citations format is consistent [1], [2], etc.

---

### Test 10: Draft with Manual Edits

**Steps:**
1. Generate draft in Insert mode
2. Manually edit the draft
3. Click "Next Question"
4. Come back to this section

**Expected:**
- ✅ Manual edits are preserved
- ✅ Citations are still tracked
- ✅ Auto-save includes both content and citations

---

## Console Checks

### Frontend Console (Browser DevTools)
- ✅ No errors when clicking "Draft from Context"
- ✅ Success log: `✅ Draft generated • X citations added • [mode] mode`
- ✅ No warnings about missing icons or components

### Backend Console (Terminal)
- ✅ Log: `🔍 Dual-phase search for PRD section: "..."`
- ✅ Log: `⚡ Phase 1: Running instant BM25 search...`
- ✅ Log: `✅ BM25 completed in Xms: Y results`
- ✅ Log: `🔄 Phase 2: Starting hybrid search (RRF + MMR)...`
- ✅ Log: `✅ Hybrid search completed in Xms: Y results`
- ✅ Log: `✅ PRD draft generation completed`

### Network Tab (Browser DevTools)
- ✅ `POST /api/prd/sections/suggest` returns 200
- ✅ Response includes `draft` and `citations` fields
- ✅ `POST /api/prd/sections` includes `citation_chunk_ids` in request body

---

## Edge Cases to Test

1. **Empty textarea** → Draft should still generate from context alone
2. **Very long existing text** → Insert mode should append, not replace
3. **Rapid clicking** → Button should be disabled during generation
4. **No pinned chunks** → Should use top 5-8 suggestions
5. **All chunks pinned** → Should use all pinned chunks
6. **Switching sections** → Citations should be section-specific
7. **Multiple drafts in a row** → Each should be independent

---

## Performance Benchmarks

- **BM25 Search**: < 300ms
- **Hybrid Search**: 2-4 seconds
- **Draft Generation**: 5-10 seconds (GPT-4)
- **Auto-save with citations**: < 500ms

---

## Success Criteria

✅ All tests pass without errors
✅ Drafts are high-quality and contextually relevant
✅ Citations are tracked and persisted
✅ UI is responsive and user-friendly
✅ Error handling is graceful
✅ Style is consistent across drafts

---

## Quick Test Checklist

- [ ] Draft button appears when context is available
- [ ] Insert mode appends draft with separator
- [ ] Replace mode overwrites textarea
- [ ] Drafts are well-formatted and grounded
- [ ] Citations are tracked and saved
- [ ] Works for all 5 section types
- [ ] Error handling works (no chunks, API errors)
- [ ] Style is consistent across multiple drafts
- [ ] Auto-save includes citations
- [ ] Pinned chunks are prioritized

