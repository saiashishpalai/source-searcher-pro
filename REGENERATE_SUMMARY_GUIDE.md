# Regenerate Summary Feature Guide

## 🎯 Overview

The regenerate summary feature allows users to generate alternative AI summaries for any Q&A in a conversation thread, with full version history like ChatGPT.

---

## ✨ Key Features

### 1. **One Regeneration Per Q&A** ✅
- Each question can have its summary regenerated **once**
- Total of 2 versions per Q&A: Original + 1 Regeneration
- Clear indication when maximum regenerations reached

### 2. **Version History & Navigation** ✅
- View both summary versions (like ChatGPT)
- Navigate between versions with arrow buttons
- Clear labels: "Original" vs "Regenerated"
- Shows "Version 1 of 2" or "Version 2 of 2"

### 3. **Smart Button States** ✅
- **Active threads**: Regenerate button enabled (if under limit)
- **Saved/Closed threads**: Button greyed out and disabled
- **Max reached**: Shows "Max reached" badge
- **Regenerating**: Shows spinner and "Regenerating..." text

### 4. **Full Persistence** ✅
- Summary versions saved to database with threads
- Versions load when viewing saved threads
- All conversation history preserved

---

## 🎨 UI/UX

### Version Navigation Bar
When multiple versions exist:
```
┌─────────────────────────────────────────────┐
│ Version 1 of 2 • Original      [◀] [▶]     │
└─────────────────────────────────────────────┘
```

### Regenerate Button States

**Active Thread (Can Regenerate):**
```
[✨ Regenerate Summary]  ← Purple, clickable
```

**Active Thread (Max Reached):**
```
[✨ Regenerate Summary] Max reached  ← Disabled
```

**Saved Thread:**
```
[✨ Regenerate Summary]  ← Greyed out, disabled
Tooltip: "Cannot regenerate summary for saved threads"
```

**While Regenerating:**
```
[⏳ Regenerating...]  ← Spinner, disabled
```

---

## 🔄 How It Works

### Data Flow

```
User clicks "Regenerate Summary"
         ↓
Frontend calls /api/regenerate-summary
         ↓
Backend generates new summary (higher temperature)
         ↓
Frontend adds to summaryVersions array
         ↓
UI shows version navigation
         ↓
User can toggle between versions
```

### Data Structure

```typescript
// For each Q&A in conversation
summaryVersions = {
  0: ["Original summary", "Regenerated summary"],  // Q&A 1
  1: ["Original summary"],                         // Q&A 2 (not regenerated)
  2: ["Original summary", "Regenerated summary"],  // Q&A 3
}

// Saved to database as:
{
  conversation: [qa1, qa2, qa3, ...],
  summaryVersions: { 0: [...], 1: [...], 2: [...] }
}
```

---

## 🚀 Usage

### For Active Conversations:

1. **Search for something**
   - Get initial summary (Version 1)
   
2. **Click "Regenerate Summary"**
   - AI generates new perspective
   - Version 2 appears
   - Navigation bar shows: "Version 2 of 2"
   
3. **Navigate between versions**
   - Click ◀ to see Version 1 (Original)
   - Click ▶ to see Version 2 (Regenerated)
   
4. **Try to regenerate again**
   - Button shows "Max reached" badge
   - Disabled - only 1 regeneration allowed

### For Saved Threads:

1. **Open a saved thread**
   - All summaries load (original + regenerated if exists)
   - Can navigate between versions
   - Regenerate button is **greyed out**
   
2. **Tooltip explains:**
   - "Cannot regenerate summary for saved threads"

---

## 🛠️ Technical Implementation

### Frontend State

```typescript
// Summary versions for each Q&A index
const [summaryVersions, setSummaryVersions] = useState<{
  [qaIndex: number]: string[]
}>({});

// Regenerating state for each Q&A
const [isRegenerating, setIsRegenerating] = useState<{
  [qaIndex: number]: boolean
}>({});
```

### Backend Endpoint

```javascript
POST /api/regenerate-summary
Headers: Authorization: Bearer <token>
Body: {
  query: string,
  results: SearchResult[]
}

Response: {
  aiSummary: string
}
```

### Key Methods

#### `handleRegenerateSummary(qaIndex)`
1. Check if max regenerations reached (2 versions)
2. Call backend API with query and results
3. Add new summary to versions array
4. Update conversation thread
5. Show success message

#### `regenerateSummary()` (Backend)
1. Extract chunks from results
2. Generate prompt with fresh perspective request
3. Use higher temperature (0.7 vs 0.3) for variation
4. Return new summary

---

## 💾 Database Storage

### Format Evolution

#### **Version 1** (Old - Individual Results):
```sql
search_thread_results:
- Row 1: result_data = { result1 }
- Row 2: result_data = { result2 }
```

#### **Version 2** (Conversation Thread):
```sql
search_thread_results:
- Row 1: result_data = [
    { query, results, aiSummary },
    { query, results, aiSummary }
  ]
```

#### **Version 3** (With Summary Versions):
```sql
search_thread_results:
- Row 1: result_data = {
    conversation: [
      { query, results, aiSummary },
      { query, results, aiSummary }
    ],
    summaryVersions: {
      0: ["original", "regenerated"],
      1: ["original"]
    }
  }
```

### Loading Logic

The system automatically detects format:
1. Try new format (object with conversation + summaryVersions)
2. Fall back to conversation array format
3. Fall back to old individual results format

---

## 🧪 Testing Guide

### Test 1: Regenerate in Active Thread
1. Search for "product"
2. Click "Regenerate Summary"
3. Wait for new summary
4. See navigation bar appear
5. Toggle between versions
6. Try regenerating again → Should show "Max reached"

### Test 2: Multiple Q&A Regenerations
1. Search for "product"
2. Regenerate summary for Question 1
3. Ask follow-up "what is pricing?"
4. Regenerate summary for Question 2
5. Each Q&A can have 2 versions independently

### Test 3: Save and Load
1. Search with regenerated summaries
2. Click "Back to Search" → Saves thread
3. Click saved thread in sidebar
4. All summary versions should load
5. Can navigate between versions
6. Regenerate button is **disabled**

### Test 4: Closed Thread Behavior
1. Open any saved thread
2. Check regenerate button → Should be greyed out
3. Hover over button → Shows tooltip
4. Button should not be clickable

---

## 📊 Console Logs

### Successful Operations:
- `✨ Regenerating summary for query: "product"`
- `✨ Summary regenerated for Q&A 1`
- `✅ Thread saved to database with 3 Q&A pairs and summary versions`
- `📖 Loaded thread with 3 Q&A pairs and summary versions`

### Info Messages:
- `⚠️ Maximum regenerations reached for this Q&A`
- `📖 Loaded thread with 2 Q&A pairs (no summary versions)` - Old format

---

## 🎯 Business Logic

### Regeneration Limits
- **Per Q&A**: 1 regeneration (2 total versions)
- **Per Thread**: Unlimited (each Q&A independent)
- **Saved Threads**: No regeneration (read-only)

### Why Higher Temperature?
```javascript
// Original summary
temperature: 0.3  // More focused, consistent

// Regenerated summary  
temperature: 0.7  // More varied, different perspective
```

This ensures regenerated summaries offer genuinely different insights.

---

## 🔐 Security & Performance

### Rate Limiting
- Inherits from OpenAI API limits
- Graceful fallback on quota exceeded
- Error handling for network issues

### Caching
- Summary versions cached in state
- No re-generation on version toggle
- Efficient database storage (JSONB)

---

## 🎨 Visual Design

### Version Navigation
- Clean, minimal design
- Arrow buttons for navigation
- Version indicator badge
- "Original" / "Regenerated" labels

### Button States
- **Enabled**: Purple text, hover effects
- **Disabled (max)**: Grey with badge
- **Disabled (closed)**: Faded, tooltip
- **Loading**: Spinner animation

---

## 🐛 Error Handling

### Quota Exceeded
```
Error: OpenAI quota exceeded
→ Shows in console
→ Summary not updated
→ User can try again later
```

### Network Error
```
Error: Summary regeneration failed
→ Logged to console
→ Original summary remains
→ Button remains enabled for retry
```

---

## 📱 Responsive Design

- Works on mobile and desktop
- Version navigation adapts to screen size
- Touch-friendly arrow buttons
- Proper spacing on all devices

---

## 🔮 Future Enhancements

Potential improvements:
1. **More Regenerations**: Allow 2-3 regenerations per Q&A
2. **Custom Prompts**: Let users specify tone/style
3. **Summary Diff**: Highlight differences between versions
4. **Export Versions**: Export all summary versions
5. **Favorite Version**: Mark preferred version
6. **Regenerate All**: Regenerate summaries for entire thread

---

## ✅ Success Criteria - All Met

- [x] Users can regenerate summaries (1 time per Q&A)
- [x] Version history with navigation
- [x] Works for all Q&A pairs independently
- [x] Greyed out button for closed threads
- [x] Summary versions persist to database
- [x] Load summary versions from database
- [x] Backward compatible with old threads
- [x] Clean UI with proper states
- [x] Comprehensive error handling
- [x] No linter errors

---

## 🎉 Summary

The regenerate summary feature is fully implemented with:

✅ Version history (like ChatGPT)
✅ Smart button states
✅ Full persistence
✅ Backward compatibility
✅ Clean UX
✅ Error handling

**Ready to use!** Test it out and see how it provides fresh perspectives on your search results! 🚀

