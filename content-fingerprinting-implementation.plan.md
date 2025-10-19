# Content Fingerprinting and Manual Version Linking

## Overview

Implement duplicate detection across sources using TF-IDF + cosine similarity (pure JavaScript, no dependencies), allow users to manually link versions or dismiss duplicates, and automatically deduplicate search results.

## Implementation Steps

### 1. Create TF-IDF Similarity Utility

**No external dependencies needed** - pure JavaScript implementation.

Create new file: `server/utils/document-similarity.js`

Implement two core functions:
- `computeTfIdf(text)` - Tokenize, count term frequencies, normalize by max frequency
- `cosineSimilarity(vec1, vec2)` - Calculate cosine similarity (0-1 scale)

**Why TF-IDF beats simhash:**
- More accurate for document versioning
- Handles semantic changes better ("Top 14" → "Top 6")
- No dependencies, pure JavaScript
- Tunable threshold (0.90 = 90% similar)
- Interpretable results (92% similarity is clear)

### 2. Database Schema Changes

Create new migration file: `database/migrations/version-linking-schema.sql`

Add these columns to `documents` table:
- `version_group_id` (UUID) - Links related document versions
- `version_number` (INTEGER, default 1) - Version sequence
- `is_latest` (BOOLEAN, default true) - Flag for latest version

Create indexes for performance:
- `idx_version_group` on `version_group_id`
- `idx_user_latest` on `(user_id, is_latest)`

### 3. Add TF-IDF Fingerprinting to Sync Services

#### Files to modify:
- `server/services/google-drive-sync.js`
- `server/services/notion-sync.js`
- `server/services/slack-sync.js`

#### Changes for each service:

**1. Import the utility:**
```javascript
const { computeTfIdf, cosineSimilarity } = require('../utils/document-similarity');
```

**2. Add `generateContentVector()` function:**
```javascript
function generateContentVector(content) {
  const normalized = content.substring(0, 10000); // First 10k chars
  return computeTfIdf(normalized);
}
```

**3. Add `findSimilarDocuments()` function:**
```javascript
async findSimilarDocuments(contentVector, userId, currentSourceType) {
  // Query documents from OTHER sources (not current)
  const { data: allDocs } = await this.supabaseAdmin
    .from('documents')
    .select('id, title, source_type, metadata, synced_at')
    .eq('user_id', userId)
    .neq('source_type', currentSourceType);
  
  if (!allDocs || allDocs.length === 0) return [];
  
  const similar = [];
  
  for (const doc of allDocs) {
    const storedVector = doc.metadata?.content_vector;
    if (!storedVector) continue;
    
    // Calculate similarity (0 to 1 scale)
    const similarity = cosineSimilarity(contentVector, storedVector);
    
    // Threshold: 90% similarity = likely same document
    if (similarity >= 0.90) {
      similar.push({
        document_id: doc.id,
        title: doc.title,
        source_type: doc.source_type,
        similarity_score: (similarity * 100).toFixed(1), // Percentage
        synced_at: doc.synced_at
      });
    }
  }
  
  return similar;
}
```

**4. Update document storage to include:**
```javascript
const contentVector = generateContentVector(doc.content);
const similar = await this.findSimilarDocuments(contentVector, userId, sourceType);

metadata: {
  ...existingMetadata,
  content_vector: contentVector, // TF-IDF vector (object)
  similarity_method: 'tfidf-cosine',
  potential_duplicates: similar.length > 0 ? similar : null
}
```

**Threshold tuning guide:**
- `>= 0.95` → Almost identical (typo fixes only)
- `>= 0.90` → Very similar (minor edits, resume example) ← **Start here**
- `>= 0.85` → Similar (section changes, reordering)
- `< 0.85` → Different documents

### 4. API Endpoints for Version Management

Add to `server/index.js`:

#### POST `/api/documents/link-versions`
- Accepts: `{ newerDocId, olderDocId }`
- Auth: Manual token verification (existing pattern)
- Verifies both docs belong to user
- Determines which is actually newer by `synced_at`
- Creates/uses `version_group_id`
- Updates older doc: `is_latest: false, version_number: 1`
- Updates newer doc: `is_latest: true, version_number: 2`
- Adds metadata: `previous_version_id`, `user_confirmed_version: true`

#### POST `/api/documents/dismiss-duplicate`
- Accepts: `{ documentId, duplicateId }`
- Auth: Manual token verification (existing pattern)
- Removes from `potential_duplicates` array
- Adds to `dismissed_duplicates` array in metadata
- Prevents future flagging

### 5. Search Deduplication Logic

Modify `server/services/search-service.js`:

Add `deduplicateVersions()` function after recency ranking:
- Groups results by `version_group_id` (or `document_id` if none)
- From each group, returns only the document with `is_latest: true`
- Falls back to most recent by `synced_at` if no `is_latest` flag
- Adds metadata: `alternate_versions_count`, `has_older_versions`

Update main `search()` method (after line ~136):
```javascript
const boostedChunks = this.applyRecencyBoost(chunks);
const deduplicatedChunks = this.deduplicateVersions(boostedChunks);
// Continue with formatting results...
```

### 6. UI Components for Duplicate Detection

#### Create new component: `src/components/DuplicateAlert.tsx`
- Props: `document`, `onLinkVersions`, `onDismiss`
- Shows yellow/warning border alert when `metadata.potential_duplicates` exists
- Displays duplicate info: title, source, similarity % (e.g., "92% similar")
- Two action buttons:
  - "These are the same document" → calls `onLinkVersions(document.id, duplicate.document_id)`
  - "These are different" → calls `onDismiss(document.id, duplicate.document_id)`
- Uses existing UI components from shadcn/ui (Alert, AlertDescription, Button)
- Import icons: `AlertTriangle` from lucide-react

#### Check and modify: `src/components/ResultCard.tsx`
- Import `DuplicateAlert` component
- Render below main content: `<DuplicateAlert document={result} onLinkVersions={...} onDismiss={...} />`
- Add version indicator badge when `result.has_older_versions === true`
- Show: "📚 {alternate_versions_count} older version(s) available"

### 7. Integration with Search Results

Modify `src/components/SearchResults.tsx`:

**Add handlers (after line 72):**
```typescript
const handleLinkVersions = async (newerDocId: string, olderDocId: string) => {
  try {
    // Call API via api-client
    await linkDocumentVersions(newerDocId, olderDocId, token);
    // Show success toast
    toast.success('Documents linked as versions');
    // Refetch search results
    if (onRetry) await onRetry();
  } catch (error) {
    toast.error('Failed to link documents');
    console.error('Link versions error:', error);
  }
};

const handleDismissDuplicate = async (documentId: string, duplicateId: string) => {
  try {
    await dismissDuplicateDocument(documentId, duplicateId, token);
    toast.success('Duplicate dismissed');
    if (onRetry) await onRetry();
  } catch (error) {
    toast.error('Failed to dismiss duplicate');
    console.error('Dismiss error:', error);
  }
};
```

**Pass handlers to SourceSection:**
Update `SourceSection` component to accept and pass through handlers to `ResultCard`

### 8. API Client Updates

Check if `src/lib/api-client.ts` exists. If not, create it.

Add these functions:

```typescript
export async function linkDocumentVersions(
  newerDocId: string, 
  olderDocId: string, 
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/documents/link-versions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ newerDocId, olderDocId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to link versions');
  }
  
  return response.json();
}

export async function dismissDuplicateDocument(
  documentId: string,
  duplicateId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/documents/dismiss-duplicate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ documentId, duplicateId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to dismiss duplicate');
  }
  
  return response.json();
}
```

## Testing Checklist

### Resume Example Test (Your Specific Case)
1. Create file v1: "Convin among India's Top 14 Startups (2024)"
2. Create file v2: "Convin among India's Top 6 Startups (2025)"
3. Upload both to different sources
4. Expected similarity: ~92-95% (should flag as duplicate)
5. Link them, verify deduplication works

### Cross-source Duplicate Detection
1. Upload same document to Google Drive
2. Upload to Slack with different name
3. Sync both → Second should flag first as potential duplicate
4. Check database: metadata.potential_duplicates should exist with 90%+ similarity

### Manual Version Linking
1. Click "These are the same document" on duplicate alert
2. Verify both docs get same `version_group_id`
3. Verify older has `is_latest: false`
4. Re-run search → Should show only latest version

### Dismiss Duplicate
1. Click "These are different" on false positive
2. Alert should disappear immediately
3. Verify added to `dismissed_duplicates` in metadata
4. Future syncs should not re-flag these two docs

### Search Deduplication
1. Link 3 versions of a document across sources (Drive, Slack, Notion)
2. Search for content from that doc
3. Should see ONE result (latest version)
4. Should show "2 older versions available" badge

### Threshold Tuning
1. If false positives (different docs flagged): increase to 0.92 or 0.95
2. If missing real duplicates: decrease to 0.88 or 0.85
3. Default 0.90 should work well for most cases

### Edge Cases
- Documents without content_vector (old docs): skip comparison
- Very short documents (< 100 chars): might have low similarity, that's OK
- Version chains (v1 → v2 → v3): all get same version_group_id
- Dismissed duplicates: should NOT reappear after re-sync

## File Summary

### New Files:
- `server/utils/document-similarity.js` (TF-IDF + cosine similarity)
- `database/migrations/version-linking-schema.sql`
- `src/components/DuplicateAlert.tsx`
- `src/lib/api-client.ts` (if doesn't exist)

### Modified Files:
- `server/services/google-drive-sync.js` (add TF-IDF fingerprinting)
- `server/services/notion-sync.js` (add TF-IDF fingerprinting)
- `server/services/slack-sync.js` (add TF-IDF fingerprinting)
- `server/services/search-service.js` (add deduplication logic)
- `server/index.js` (add 2 new API endpoints)
- `src/components/ResultCard.tsx` (render DuplicateAlert)
- `src/components/SearchResults.tsx` (add handlers)
- `src/components/SourceSection.tsx` (pass through handlers)

### NOT Modified:
- `package.json` (no new dependencies!)

## Success Criteria
✅ TF-IDF utility works with pure JavaScript (no dependencies)
✅ Sync services detect similar documents (>= 90% similarity threshold)
✅ Resume example ("Top 14" → "Top 6") detected as ~92-95% similar
✅ Database has version tracking columns with indexes
✅ API endpoints for linking and dismissing work with proper auth
✅ Search deduplicates versions (only shows latest)
✅ UI shows duplicate alerts with similarity percentage
✅ Linking documents updates database correctly
✅ Dismissing removes alert permanently and prevents re-flagging
✅ Search results show version count indicator ("2 older versions")

## Performance Notes
- TF-IDF vectors: ~100-500 terms per document (acceptable size)
- JSONB storage in Postgres handles this well
- Comparison is O(n) where n = unique terms (fast for < 1000 docs/user)
- If scaling to 10k+ docs, consider storing only top 100 terms
- Don't optimize prematurely - current approach is fine
