# Testing RAG Optimizations Guide

This guide helps you test and verify the RAG optimization improvements.

## Prerequisites

1. **Environment Setup**
   - Copy `.env.local.example` to `.env.local`
   - Set all required variables (Supabase, OpenAI API key)
   - Add optimization variables (optional, defaults are set):

```env
# RAG Optimization Settings
RAG_MATCH_THRESHOLD=0.7
RAG_MAX_CHUNKS=7
RAG_RELEVANCE_THRESHOLD=0.65
PRD_MAX_CITATIONS=5
CHUNK_SIZE=600
CHUNK_OVERLAP=100
MAX_CHUNKS_PER_DOCUMENT=20
```

2. **Test Data**
   - Sync at least 5-10 documents from Google Drive, Notion, or Slack
   - Ensure documents contain diverse content (technical docs, meeting notes, etc.)

## Quick Test (Automated)

Run the automated test script:

```bash
node scripts/test-rag-optimizations.js
```

This will test:
- ✅ RAG retrieval quality (chunk count, relevance scores)
- ✅ Chunking improvements (chunk sizes, sentence boundaries)
- ✅ PRD generation quality (citation count)

## Manual Testing

### 1. Test RAG Retrieval Quality

#### Via API (curl)

```bash
# Replace YOUR_TOKEN with your Supabase JWT token
curl -X POST http://localhost:3000/api/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the API endpoints?",
    "sources": ["google_drive", "notion", "slack"]
  }'
```

#### Via Frontend

1. Open your app at `http://localhost:8080`
2. Perform several searches:
   - **Specific query**: "authentication API endpoints"
   - **General query**: "project timeline"
   - **Definition query**: "What is the system architecture?"

#### What to Check

✅ **Result Count**: Should be ≤ 5 results (not 10+)
✅ **Relevance**: Results should be highly relevant to query
✅ **Response Time**: Should be faster (< 2 seconds)
✅ **AI Summary**: Should be concise and accurate

#### Expected Improvements

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Results per query | 10 | ≤5 | ✅ |
| Avg relevance score | ~0.5 | ≥0.65 | ✅ |
| Token usage | ~3750 | ~625 | ✅ |
| Search time | Slower | Faster | ✅ |

### 2. Test Chunking Improvements

#### Check Chunk Statistics

```sql
-- Run in Supabase SQL Editor
SELECT 
  AVG(LENGTH(content)) as avg_chunk_size,
  MIN(LENGTH(content)) as min_chunk_size,
  MAX(LENGTH(content)) as max_chunk_size,
  COUNT(*) FILTER (WHERE LENGTH(content) <= 600) as small_chunks,
  COUNT(*) FILTER (WHERE LENGTH(content) > 600 AND LENGTH(content) <= 1000) as medium_chunks,
  COUNT(*) FILTER (WHERE LENGTH(content) > 1000) as large_chunks,
  COUNT(*) as total_chunks
FROM document_chunks
WHERE user_id = 'YOUR_USER_ID';
```

#### Expected Results

✅ **Average chunk size**: ~600 chars (not 1500)
✅ **Small chunks (≤600)**: > 60% of total
✅ **Large chunks (>1000)**: < 20% of total
✅ **Sentence boundaries**: Chunks should end with punctuation

### 3. Test PRD Generation

#### Create a Test PRD

1. Go to PRD Builder in your app
2. Fill in basic sections:
   - Objective: "Build user authentication"
   - Background: "Users need secure login"
   - Scope: "OAuth 2.0 implementation"
   - Requirements: "Support Google OAuth"
   - Success Metrics: "100% success rate"
   - Timeline: "2 weeks"

3. Select 5-10 document citations
4. Generate PRD

#### What to Check

✅ **Citation Count**: Should be ≤ 5 (not 20)
✅ **Empty Sections**: Should be minimal or none
✅ **Section Quality**: All sections should have content
✅ **Generation Time**: Should be faster

#### Check Citation Compression

If you selected >3 citations, they should be compressed:
- Check server logs for: `🗜️ Compressing X citations`
- Citations should be summarized, not full chunks

### 4. Monitor Token Usage

#### Check OpenAI Usage Dashboard

1. Go to https://platform.openai.com/usage
2. Compare usage before/after optimization
3. Expected reduction: **70-80%**

#### Calculate Token Savings

```javascript
// Before optimization
const beforeTokens = 10 * 375; // 10 chunks × 375 tokens = 3750

// After optimization  
const afterTokens = 5 * 125; // 5 chunks × 125 tokens = 625

const savings = ((beforeTokens - afterTokens) / beforeTokens) * 100;
console.log(`Token savings: ${savings.toFixed(1)}%`); // ~83%
```

## Comparison Testing

### Before/After Comparison

1. **Set old values** (in `.env.local`):
```env
RAG_MATCH_THRESHOLD=0.3
RAG_MAX_CHUNKS=20
PRD_MAX_CITATIONS=20
CHUNK_SIZE=1500
```

2. **Run test queries** and note:
   - Number of results
   - Relevance scores
   - Response time
   - Token usage (from OpenAI dashboard)

3. **Set new optimized values**:
```env
RAG_MATCH_THRESHOLD=0.7
RAG_MAX_CHUNKS=7
PRD_MAX_CITATIONS=5
CHUNK_SIZE=600
```

4. **Run same test queries** and compare

### Expected Differences

| Test | Before | After | Improvement |
|------|--------|-------|-------------|
| Search results | 10+ results | ≤5 results | 50% fewer |
| Relevance | Mixed quality | High quality | Better precision |
| PRD citations | 20 chunks | 5 chunks | 75% fewer |
| Empty PRD sections | Common | Rare | Better quality |
| Token usage | High | Low | 70-80% reduction |

## Troubleshooting

### Issue: Too Few Results

**Symptom**: Search returns 0-1 results

**Solution**: Lower `RAG_MATCH_THRESHOLD`:
```env
RAG_MATCH_THRESHOLD=0.6  # Lower threshold
```

### Issue: Low Relevance Results

**Symptom**: Results don't match query well

**Solution**: Increase `RAG_RELEVANCE_THRESHOLD`:
```env
RAG_RELEVANCE_THRESHOLD=0.7  # Higher threshold
```

### Issue: PRD Has Empty Sections

**Symptom**: PRD sections are empty or low confidence

**Solution**: 
1. Check if citations are relevant
2. Ensure documents are synced
3. Check server logs for validation errors

### Issue: Chunks Still Too Large

**Symptom**: Average chunk size > 600 chars

**Solution**: 
1. Re-sync documents (chunks are created during sync)
2. Verify `CHUNK_SIZE=600` in `.env.local`
3. Check sync service logs for chunk size

## Performance Benchmarks

### Target Metrics

✅ **Search Performance**
- Results: 3-5 per query
- Relevance: ≥ 0.65 average
- Response time: < 2 seconds
- Token usage: < 2000 tokens per search

✅ **PRD Generation**
- Citations: ≤ 5
- Empty sections: 0-1
- Generation time: < 30 seconds
- Token usage: < 3000 tokens per PRD

✅ **Chunking**
- Average size: 400-600 chars
- Large chunks (>1000): < 20%
- Sentence boundaries: > 70%

## Continuous Monitoring

### Daily Checks

1. Monitor OpenAI API usage dashboard
2. Check search quality metrics
3. Review PRD generation success rate
4. Monitor error logs for optimization issues

### Weekly Reviews

1. Compare token usage week-over-week
2. Review user feedback on search quality
3. Analyze PRD completeness metrics
4. Adjust thresholds if needed

## Next Steps

After verifying optimizations:

1. ✅ Deploy to production
2. ✅ Monitor for 1 week
3. ✅ Collect user feedback
4. ✅ Fine-tune thresholds if needed
5. ✅ Document any custom configurations

## Support

If you encounter issues:
1. Check server logs for errors
2. Verify environment variables
3. Test with different queries
4. Compare before/after metrics

