# Quick Start Guide - Search Improvements

## 🚀 Get Started in 3 Steps

### Step 1: Run Database Migration

Copy and paste the entire contents of `database-search-threads.sql` into your Supabase SQL Editor and click "Run".

```sql
-- The file creates:
-- 1. search_threads table
-- 2. search_thread_results table
-- 3. RLS policies
-- 4. Indexes
```

**Verification**: Run this query to confirm:
```sql
SELECT COUNT(*) FROM search_threads;
```

---

### Step 2: Restart Backend Server

```bash
cd server
npm start
```

You should see:
```
✓ API server running on http://localhost:3000
```

---

### Step 3: Test the Features

Open your app and try these:

#### Test 1: Recent Searches (6 Max)
1. Do 7 searches
2. Only 6 most recent should show
3. ✅ Works!

#### Test 2: Follow-up Questions
1. Search: "product"
2. Open console (F12)
3. Ask follow-up: "what is the price?"
4. Console shows: "🔍 Follow-up search within X documents"
5. ✅ Works!

#### Test 3: Thread Persistence
1. Search anything
2. Click "Back to Search"
3. Thread appears in sidebar
4. Refresh page
5. Thread still there
6. ✅ Works!

---

## 📝 Quick Reference

### Console Messages

**Success Messages**:
- ✅ Thread saved to database
- ✅ Thread renamed in database
- ✅ Thread deleted from database

**Debug Messages**:
- 🔍 Follow-up search within X documents
- 📊 Found X relevant chunks

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| TypeScript errors | Run the database migration first |
| Threads not saving | Check RLS policies in Supabase |
| Follow-up not working | Check console for document IDs |
| Backend not responding | Restart server with `npm start` |

---

## 📚 Documentation

- **Full Details**: See `SEARCH_IMPROVEMENTS_README.md`
- **Summary**: See `IMPLEMENTATION_SUMMARY.md`
- **This Guide**: `QUICK_START.md`

---

## ✅ All Done!

Your search improvements are ready to use! 🎉

**What's New**:
- Recent searches limited to 6 (FIFO)
- Follow-up questions search within found docs
- Threads auto-save and persist
- Full CRUD on threads (edit/delete)

**Need Help?**
Check the detailed docs or review console logs for errors.

