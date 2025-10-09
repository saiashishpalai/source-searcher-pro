# Search Improvements Implementation Guide

## Overview

This document outlines the three major improvements implemented to the search functionality:

1. **Recent Searches Limited to 6 (FIFO)**
2. **Follow-up Questions Search Within Found Documents (RAG)**
3. **Thread/Conversation Persistence with Full CRUD Operations**

---

## 1. Recent Searches Limit (FIFO)

### What Changed
- Recent searches are now limited to 6 items maximum
- Uses First-In-First-Out (FIFO) logic - oldest search is removed when adding a 7th item
- Applied consistently across all search operations

### Implementation
- Modified `SearchInterface.tsx` lines 455-458 and 539-542
- Changed from 10 to 6 maximum searches
- Automatically removes oldest search when limit is reached

### Usage
No changes required - the limit is automatic. Users will see only their 6 most recent searches.

---

## 2. Follow-up Questions with RAG

### What Changed
- Follow-up questions now search ONLY within the documents found in the initial search
- Uses RAG (Retrieval Augmented Generation) approach
- No more placeholder values - real AI-powered responses

### How It Works
1. **Initial Search**: When you search for "product", the system finds all relevant documents
2. **Document Tracking**: The system stores the IDs of these found documents
3. **Follow-up Search**: When you ask a follow-up question, it searches ONLY within those stored document IDs
4. **RAG Processing**: Uses OpenAI to generate contextual answers from the specific documents

### Backend Changes
- Added new endpoint: `POST /api/search/followup`
- Added `searchWithinDocuments()` method in `search-service.js`
- Searches are scoped to specific document IDs

### Frontend Changes
- Tracks document IDs in `currentSearchDocumentIds` state
- Uses follow-up endpoint instead of full search
- Updates document IDs after each follow-up for chained questions

### API Endpoint
```javascript
POST http://localhost:3000/api/search/followup
{
  "query": "your follow-up question",
  "documentIds": ["doc-id-1", "doc-id-2", ...]
}
```

---

## 3. Thread/Conversation Persistence

### What Changed
- Search threads are now saved to the database automatically
- Full CRUD operations: Create, Read, Update, Delete
- Threads persist across sessions
- Edit thread names directly in the UI
- Delete threads from UI and database

### Database Schema

Two new tables were created:

#### `search_threads`
- Stores conversation metadata
- Fields: `id`, `user_id`, `title`, `query`, `created_at`, `updated_at`

#### `search_thread_results`
- Stores search results for each thread
- Fields: `id`, `thread_id`, `result_data` (JSONB)

### Operations

#### **Auto-Save on "Back to Search"**
When you click "Back to Search", the current search results are automatically saved as a thread:
```typescript
// Saves thread with:
// - Query as title
// - All search results
// - Timestamp
```

#### **Load Threads on Mount**
All threads are loaded from the database when the component mounts:
```typescript
// Fetches threads ordered by updated_at DESC
// Includes all associated results
```

#### **Edit Thread Name**
Click the edit icon on any thread to rename it:
```typescript
// Updates both local state and database
// Changes persist immediately
```

#### **Delete Thread**
Click the trash icon to delete a thread:
```typescript
// Deletes from database (CASCADE removes results too)
// Removes from UI immediately
```

---

## Setup Instructions

### 1. Run Database Migration

Run the SQL script to create the new tables:

```bash
# In your Supabase SQL Editor, run:
cat database-search-threads.sql
```

Or manually execute the SQL:
```sql
-- Create search_threads table
CREATE TABLE IF NOT EXISTS search_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create search_thread_results table
CREATE TABLE IF NOT EXISTS search_thread_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES search_threads(id) ON DELETE CASCADE NOT NULL,
  result_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and create policies (see full file for details)
```

### 2. Update Supabase Types (Optional)

To fix TypeScript errors, regenerate Supabase types:

```bash
# Using Supabase CLI
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

Alternatively, add type assertions to bypass TypeScript errors (temporary solution).

### 3. Restart Backend Server

```bash
cd server
npm start
# or
node index.js
```

### 4. Test the Features

#### Test Recent Searches Limit
1. Perform 7 searches
2. Verify only the 6 most recent appear
3. Oldest search should disappear

#### Test Follow-up Search
1. Search for "product"
2. Review the console - note the documents found
3. Ask a follow-up question like "what is the price?"
4. Check console - it should show "Follow-up search within X documents"
5. Verify results are contextual to the initial search

#### Test Thread Persistence
1. Perform a search
2. Click "Back to Search"
3. Check sidebar - thread should appear
4. Refresh page - thread should still be there
5. Edit thread name - changes should persist
6. Delete thread - should remove from database

---

## Technical Details

### File Changes Summary

1. **Frontend** (`src/components/SearchInterface.tsx`)
   - Added `currentSearchDocumentIds` state
   - Added `isLoadingThreads` state
   - Added `useEffect` to load threads on mount
   - Updated `handleSearch` to track document IDs
   - Rewrote `handleFollowUpQuestion` to use follow-up endpoint
   - Updated `handleBackToSearch` to save threads
   - Updated `handleRenameThread` with database sync
   - Updated `handleDeleteThread` with database sync

2. **Backend** (`server/index.js`)
   - Added `/api/search/followup` endpoint

3. **Search Service** (`server/services/search-service.js`)
   - Added `searchWithinDocuments()` method

4. **Database** (`database-search-threads.sql`)
   - Created `search_threads` table
   - Created `search_thread_results` table
   - Added RLS policies
   - Added indexes for performance
   - Added trigger for auto-updating timestamps

### State Management

The component now manages:
- `searchResults` - Current search results
- `currentSearchDocumentIds` - IDs of documents from last search (for follow-ups)
- `conversations` - List of saved threads (loaded from DB)
- `isLoadingThreads` - Loading state for threads

### API Flow

```
Initial Search:
User → Frontend → /api/search → Search all documents → Track IDs

Follow-up Search:
User → Frontend → /api/search/followup + documentIds → Search within IDs only

Save Thread:
Frontend → Supabase → Insert thread + results

Load Threads:
Frontend → Supabase → Select threads + results

Update Thread:
Frontend → Supabase → Update thread title

Delete Thread:
Frontend → Supabase → Delete thread (CASCADE deletes results)
```

---

## Troubleshooting

### TypeScript Errors
**Issue**: `Property 'search_threads' does not exist`
**Solution**: Run database migration, then regenerate Supabase types (see Setup step 2)

### Follow-up Not Working
**Issue**: Follow-up search returns all results, not scoped results
**Solution**: Check console logs for document IDs. If empty, ensure initial search is populating `currentSearchDocumentIds`

### Threads Not Saving
**Issue**: Threads don't appear in sidebar
**Solution**: 
1. Check if database migration ran successfully
2. Verify RLS policies allow user to insert
3. Check browser console for errors

### Threads Not Loading
**Issue**: Threads don't load on refresh
**Solution**:
1. Check `isLoadingThreads` state
2. Verify database tables exist
3. Check user authentication

---

## Future Enhancements

Potential improvements for the future:

1. **Thread Search** - Search within saved threads
2. **Thread Export** - Export threads as PDF or Markdown
3. **Thread Sharing** - Share threads with other users
4. **Better RAG** - Use vector search instead of text search for follow-ups
5. **Thread Categories** - Organize threads into folders or categories
6. **Infinite Scroll** - Load threads on-demand for better performance
7. **Thread Preview** - Show snippet of results in sidebar

---

## Questions or Issues?

If you encounter any issues:
1. Check console logs (both frontend and backend)
2. Verify database migrations ran successfully
3. Ensure Supabase RLS policies are correct
4. Check that OpenAI API key is valid (for follow-up summaries)

---

## Summary

All three features are now fully implemented:

✅ Recent searches limited to 6 with FIFO logic
✅ Follow-up questions search within found documents using RAG
✅ Threads are saved, loaded, edited, and deleted from database

The search experience is now more intuitive, contextual, and persistent!

