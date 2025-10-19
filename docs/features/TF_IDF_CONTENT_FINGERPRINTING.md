# TF-IDF Content Fingerprinting & Duplicate Detection

## Overview

Haven7 includes an advanced content fingerprinting system that automatically detects similar documents across different sources (Slack, Notion, Google Drive) using TF-IDF (Term Frequency-Inverse Document Frequency) cosine similarity. This helps users identify and manage duplicate content across their connected platforms.

## Features

### 🔍 **Automatic Duplicate Detection**
- **Cross-Source Comparison**: Detects similar documents across Slack, Notion, and Google Drive
- **90% Similarity Threshold**: Only flags documents with 90%+ similarity to reduce false positives
- **Pure JavaScript Implementation**: No external dependencies, fast and reliable
- **Real-time Processing**: Duplicate detection happens during document sync

### 🎯 **Manual Override UI**
- **Yellow Alert Boxes**: Clear visual indicators for potential duplicates
- **"These are the same document" Button**: Link documents as versions
- **"These are different" Button**: Dismiss duplicate alerts
- **Loading States**: Visual feedback with spinners and success/error states
- **Auto-hide**: Completed actions automatically hide after 2 seconds

### 🔗 **Version Linking System**
- **Document Versioning**: Link multiple documents as versions of the same content
- **Smart Deduplication**: Search results show only the latest version
- **Version Tracking**: Database tracks version groups, numbers, and latest status
- **Cross-Platform**: Works across all connected sources

## How It Works

### 1. **Content Analysis**
When documents are synced, the system:
1. Extracts text content from documents
2. Normalizes and tokenizes the text
3. Computes TF-IDF vectors for each document
4. Stores content vectors in document metadata

### 2. **Similarity Detection**
During sync, the system:
1. Compares new documents against existing documents from other sources
2. Calculates cosine similarity between TF-IDF vectors
3. Flags documents with 90%+ similarity as potential duplicates
4. Stores potential duplicates in document metadata

### 3. **User Interface**
When users search and encounter documents with potential duplicates:
1. Yellow alert boxes appear in search results
2. Users can see similarity percentage and source information
3. Users can link documents as versions or dismiss the alert
4. Actions are processed with visual feedback and toast notifications

## Technical Implementation

### **TF-IDF Algorithm**
```javascript
// Pure JavaScript implementation
function computeTfIdf(text) {
  // Normalize and tokenize text
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 3);
  
  // Count term frequencies
  const termFreq = {};
  tokens.forEach(token => {
    termFreq[token] = (termFreq[token] || 0) + 1;
  });
  
  // Normalize by max frequency
  const maxFreq = Math.max(...Object.values(termFreq));
  Object.keys(termFreq).forEach(term => {
    termFreq[term] = termFreq[term] / maxFreq;
  });
  
  return termFreq;
}
```

### **Cosine Similarity**
```javascript
function cosineSimilarity(vec1, vec2) {
  const allTerms = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  allTerms.forEach(term => {
    const v1 = vec1[term] || 0;
    const v2 = vec2[term] || 0;
    dotProduct += v1 * v2;
    magnitude1 += v1 * v1;
    magnitude2 += v2 * v2;
  });
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}
```

## Database Schema

### **Version Tracking Columns**
```sql
-- Add version tracking columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS version_group_id UUID,
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_version_group ON documents(version_group_id);
CREATE INDEX IF NOT EXISTS idx_user_latest ON documents(user_id, is_latest);
```

### **Metadata Structure**
```json
{
  "content_vector": {
    "term1": 0.8,
    "term2": 0.6,
    "term3": 0.4
  },
  "similarity_method": "tfidf-cosine",
  "potential_duplicates": [
    {
      "document_id": "uuid",
      "title": "Document Title",
      "source_type": "notion",
      "similarity_score": "94.2",
      "synced_at": "2025-10-19T10:00:00Z"
    }
  ]
}
```

## API Endpoints

### **Link Document Versions**
```http
POST /api/documents/link-versions
Content-Type: application/json
Authorization: Bearer <token>

{
  "newerDocumentId": "uuid",
  "olderDocumentId": "uuid"
}
```

### **Dismiss Duplicate**
```http
POST /api/documents/dismiss-duplicate
Content-Type: application/json
Authorization: Bearer <token>

{
  "documentId": "uuid",
  "duplicateId": "uuid"
}
```

## Configuration

### **Similarity Threshold**
The default similarity threshold is 90%. This can be adjusted in the sync services:

```javascript
// In server/services/*-sync.js
if (similarity >= 0.90) {  // Adjust this value
  // Flag as potential duplicate
}
```

### **Threshold Guidelines**
- **95%+**: Almost identical (typo fixes only)
- **90%+**: Very similar (minor edits, your resume case)
- **85%+**: Similar (section changes, reordering)
- **<85%**: Different documents

## Performance Considerations

### **Vector Size**
- TF-IDF vectors can be large (100-500 terms per document)
- Suitable for small to medium scale (< 1000 docs per user)
- JSONB storage in PostgreSQL handles it efficiently
- Comparison is O(n) where n = unique terms

### **Scaling Recommendations**
For 10k+ documents per user, consider:
- Store only top 100 terms (reduce vector size)
- Migrate to document embeddings (OpenAI)
- Implement caching for similarity calculations

## Debug Tools

### **Check Duplicates**
```bash
curl -k -s "https://localhost:3000/api/debug/check-duplicates?userId=<user-id>"
```

### **Reset Dismissed Duplicates**
```bash
curl -k -X POST -H "Content-Type: application/json" \
  -d '{"userId":"<user-id>"}' \
  "https://localhost:3000/api/debug/reset-dismissed-duplicates"
```

## User Experience

### **Visual Feedback**
- **Loading States**: Spinners during processing
- **Success States**: Green checkmarks and "Linked!" / "Dismissed!" messages
- **Error States**: Red X icons and "Failed" messages
- **Auto-hide**: Completed actions fade out after 2 seconds

### **Toast Notifications**
- **Success**: "✅ Documents linked as versions! Search will now show only the latest version."
- **Dismiss**: "✅ Duplicate dismissed! This alert will no longer appear."
- **Error**: "❌ Failed to link documents. Please try again."

## Testing

### **Create Test Duplicates**
1. Create similar documents in different sources
2. Wait for sync to detect duplicates
3. Search for the content to see duplicate alerts
4. Test linking and dismissing actions

### **Reset for Testing**
Use the debug endpoint to reset dismissed duplicates and test again.

## Future Enhancements

- **Machine Learning**: Improve similarity detection with ML models
- **Bulk Actions**: Link/dismiss multiple duplicates at once
- **Analytics**: Track duplicate patterns and user behavior
- **Smart Suggestions**: AI-powered duplicate recommendations
- **Version History**: Track document evolution over time
