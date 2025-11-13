# Wireframe Feature - Issues Fixed

## Issues Identified and Resolved

### Issue #1: ❌ Storage Upload Path Incorrect
**Problem:** The upload was failing with "Bucket not found" because the file path included the bucket name twice.

**Code Location:** `src/components/WireframeUpload.tsx:70`

**What was wrong:**
```typescript
const filePath = `wireframes/${fileName}`;  // ❌ Wrong!
```

The code was trying to upload to `wireframes/wireframes/{filename}` because:
1. `.from('wireframes')` already specifies the bucket
2. Adding `wireframes/` in the path created a nested structure that doesn't exist

**Fix Applied:**
```typescript
const filePath = fileName;  // ✅ Correct!
```

Now uploads to `wireframes/{filename}` correctly.

---

### Issue #2: ❌ Backend Payload Limit Too Small
**Problem:** The 413 "Payload Too Large" error occurred because Express's default JSON limit is 100KB, but base64-encoded wireframes can be 1-5MB+.

**Code Location:** `server/index.js:50`

**What was wrong:**
```typescript
app.use(express.json());  // ❌ Default 100kb limit
```

**Fix Applied:**
```typescript
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
```

Now accepts payloads up to 25MB (enough for ~18MB base64-encoded images).

---

### Issue #3: ❌ Backend Server Not Restarted
**Problem:** Even after fixing the code, the server was running the old version without the 25MB limit.

**Fix Applied:**
- Killed the old server process
- Restarted with: `cd server && npm start`
- Server now running on port 8085 with the updated 25MB limit
- Vite proxy correctly forwards requests from :8081/api → :8085/api

---

## Verification

### ✅ Storage Bucket Status
- **Bucket exists:** `wireframes` ✓
- **Public:** Yes ✓
- **File size limit:** 10 MB ✓
- **MIME types:** image/png, image/jpeg, image/jpg, application/pdf ✓
- **Policies:** 3 policies (upload, view, delete) ✓

### ✅ Backend Server Status
- **Running:** Yes (port 8085) ✓
- **Payload limit:** 25MB ✓
- **CORS:** Configured for localhost:8081 ✓
- **Health endpoint:** Responding ✓

### ✅ Frontend Configuration
- **Vite proxy:** Forwards /api to localhost:8085 ✓
- **API client:** Uses relative URLs in dev ✓
- **Upload component:** Fixed file path ✓

---

## Testing Steps

Now try the feature again:

1. **Navigate to PRD creation:**
   - Go to `https://localhost:8081/prd/new`

2. **Upload wireframe:**
   - Fill in Steps 1-2 (Objective, Background)
   - In Step 3 (Scope), upload a wireframe
   - **Expected:** Preview thumbnail appears, no "Bucket not found" error

3. **Generate requirements:**
   - Click "Next" to Step 4
   - Click "Generate Requirements from Wireframe"
   - **Expected:** 
     - Loading spinner for 10-30 seconds
     - No 413 error
     - Requirements populate in textarea
     - Confidence score shows in toast

---

## What Should Work Now

✅ **Upload:** Files upload to `wireframes/{user_id}-{timestamp}.{ext}`  
✅ **Storage:** Files stored in Supabase Storage  
✅ **Generation:** Backend accepts large base64 payloads  
✅ **GPT-4 Vision:** Analyzes wireframe and generates detailed requirements  
✅ **Auto-save:** Wireframe URL and metadata saved to `prd_sections` table  

---

## If Issues Persist

### Check Browser Console
Look for:
- ❌ 413 errors → Backend not restarted (check port 8085)
- ❌ "Bucket not found" → Check Storage bucket exists
- ❌ CORS errors → Check backend CORS config includes localhost:8081
- ❌ 401 errors → User not authenticated

### Check Backend Logs
```bash
tail -f /tmp/server.log
```

Look for:
- ✅ "API server running on https://localhost:8085"
- ❌ Any errors during startup

### Verify Server Running
```bash
ps aux | grep "node.*index.js" | grep -v grep
```

Should show `node index.js` process running.

### Test Health Endpoint
```bash
curl https://localhost:8085/api/health -k
```

Should return: `{"status":"ok","timestamp":"..."}`

---

## Summary of Changes

### Files Modified
1. **`src/components/WireframeUpload.tsx`**
   - Fixed upload path from `wireframes/${fileName}` to `${fileName}`

2. **`server/index.js`**
   - Increased payload limit to 25MB for JSON and urlencoded

### Actions Taken
1. Restarted backend server on port 8085
2. Verified Vite proxy configuration (already correct)
3. Verified storage bucket exists with correct policies

---

**Status:** All 3 issues fixed ✅  
**Ready to test:** Yes 🚀

Try uploading a wireframe now!

