# Quick Test Guide - RAG Optimizations

## 🚀 Quick Start (5 minutes)

### Step 1: Set Environment Variables

Add to your `.env.local`:

```env
# RAG Optimization Settings (optional - defaults are optimized)
RAG_MATCH_THRESHOLD=0.7
RAG_MAX_CHUNKS=7
RAG_RELEVANCE_THRESHOLD=0.65
PRD_MAX_CITATIONS=5
CHUNK_SIZE=600
CHUNK_OVERLAP=100
```

### Step 2: Run Automated Test

```bash
node scripts/test-rag-optimizations.js
```

### Step 3: Manual Verification

1. **Test Search** (via UI or API):
   - Query: "What are the API endpoints?"
   - ✅ Should return ≤ 5 results
   - ✅ Results should be highly relevant

2. **Test PRD Generation**:
   - Create a PRD with citations
   - ✅ Should use ≤ 5 citations
   - ✅ No empty sections

3. **Check Token Usage**:
   - Visit https://platform.openai.com/usage
   - ✅ Should see 70-80% reduction

## 📊 Expected Results

| Test | Before | After | ✅ |
|------|--------|-------|-----|
| Search results | 10 | ≤5 | ✅ |
| Avg relevance | 0.5 | ≥0.65 | ✅ |
| PRD citations | 20 | ≤5 | ✅ |
| Token usage | High | Low | ✅ |

## 🔍 Quick Checks

### Check 1: Search Quality
```bash
# Via API
curl -X POST http://localhost:3000/api/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "test query"}'
```

**Expected**: ≤5 results, high relevance scores

### Check 2: Chunk Sizes
```sql
-- In Supabase SQL Editor
SELECT AVG(LENGTH(content)) as avg_size 
FROM document_chunks 
WHERE user_id = 'YOUR_USER_ID';
```

**Expected**: ~600 chars (not 1500)

### Check 3: PRD Citations
Create a PRD and check server logs:
```
✅ Compressed X citations
```

**Expected**: ≤5 citations used

## ⚠️ Troubleshooting

**Too few results?** → Lower `RAG_MATCH_THRESHOLD=0.6`

**Low relevance?** → Increase `RAG_RELEVANCE_THRESHOLD=0.7`

**Chunks too large?** → Re-sync documents with `CHUNK_SIZE=600`

## 📚 Full Documentation

See [TESTING_RAG_OPTIMIZATIONS.md](./TESTING_RAG_OPTIMIZATIONS.md) for detailed testing guide.

