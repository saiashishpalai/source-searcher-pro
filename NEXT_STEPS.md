# 🎯 Slack Integration - Ready to Test!

**All code is complete!** Here's exactly what to do next:

---

## ⚡ Quick Start (5 Steps)

### Step 1: Configure Slack Credentials

Run this script to add your Slack credentials to `.env.local`:

```bash
./setup-slack.sh
```

If that doesn't work, manually add to `.env.local`:
```bash
SLACK_CLIENT_ID=9686909204692.9680577385413
SLACK_CLIENT_SECRET=843eda4877df61a3461a441cb13c58f8
VITE_SLACK_CLIENT_ID=9686909204692.9680577385413
```

---

### Step 2: Start ngrok Tunnel

In a **new terminal**, start ngrok:

```bash
./ngrok http 3000
```

You'll see:
```
Forwarding   https://abc123xyz.ngrok.io -> http://localhost:3000
```

**COPY THIS URL!** (e.g., `https://abc123xyz.ngrok.io`)

> ⚠️ **Keep this terminal open** - don't close it!

---

### Step 3: Update Environment Variables

Edit `.env.local` and update these two lines:

```bash
VITE_API_URL=https://abc123xyz.ngrok.io
API_BASE_URL=https://abc123xyz.ngrok.io
```

Replace `abc123xyz` with YOUR actual ngrok subdomain from Step 2.

---

### Step 4: Update Slack App OAuth Settings

1. Go to: https://api.slack.com/apps/A09L0GZBBC5/oauth
2. Under **Redirect URLs**, click **Add New Redirect URL**
3. Paste: `https://abc123xyz.ngrok.io/api/auth/slack/callback`
   - (Replace `abc123xyz` with your ngrok URL)
4. Click **Save URLs**

---

### Step 5: Start Your Application

In a **different terminal** (keep ngrok running):

```bash
npm run dev
```

This starts both the frontend (port 8080) and API server (port 3000).

---

## 🧪 Test the Integration

### Test 1: Connect Slack

1. Open browser to: **http://localhost:8080**
2. Log in to your Haven7 account
3. Click **Connect Sources** in the navigation
4. Find the **Slack** card
5. Click **Connect**
6. Click **Continue to Slack** in the permission modal
7. **Authorize** your Slack workspace
8. You should be redirected back with "Connected ✓"

**✅ Success:** Slack shows "Connected" badge

---

### Test 2: Add App to Channels

Before syncing, you need to add your app to channels:

1. Open your **Slack workspace**
2. Go to any channel (e.g., #general)
3. Type: `/invite @[YourAppName]`
4. Press Enter

Repeat for any channels you want to index.

> 💡 **Tip:** The app only has access to channels you explicitly invite it to!

---

### Test 3: Sync Messages

1. Back in Haven7, on the **Connected Sources** page
2. Find your Slack connection
3. Click **Sync Documents**
4. Wait 1-2 minutes (you'll see a loading spinner)
5. Check the stats:
   - **Documents:** Number of conversations synced
   - **Chunks:** Number of searchable pieces
   - **Last Sync:** Current timestamp

**✅ Success:** Stats show synced documents and chunks

---

### Test 4: Search Slack Messages

1. Go to the main **Dashboard/Search** page
2. Enter a search query (e.g., "project status" or "meeting")
3. Click **Search** 
4. Look for results with:
   - **Source badge:** "Slack"
   - **Title:** "#channel-name - [date range]"
   - **Content:** Your Slack messages!

**✅ Success:** Search results include Slack messages

---

### Test 5: Cross-Source Search

Try a query that should return results from multiple sources:

- "documentation" (might be in Drive, Notion, AND Slack)
- "project plan"
- "customer feedback"

**✅ Success:** Results include documents from Slack, Google Drive, and Notion together!

---

## 🐛 Troubleshooting

### Problem: "redirect_uri_mismatch"

**Solution:**
1. Double-check your ngrok URL is correct in `.env.local`
2. Verify Slack App has the EXACT URL (including `/callback`)
3. Restart your server: `npm run dev`

---

### Problem: "No conversations found"

**Solution:**
- Add the app to channels using `/invite @[AppName]`
- Make sure you're a member of those channels
- Try again after inviting the app

---

### Problem: ngrok URL changed

**Cause:** ngrok creates a new URL each time it restarts

**Solution:**
1. Get the new ngrok URL
2. Update `.env.local` with new URL
3. Update Slack App OAuth settings with new URL
4. Restart server

---

### Problem: "Token exchange failed"

**Solution:**
1. Verify your credentials in `.env.local`:
   ```
   SLACK_CLIENT_ID=9686909204692.9680577385413
   SLACK_CLIENT_SECRET=843eda4877df61a3461a441cb13c58f8
   ```
2. Try disconnecting and reconnecting Slack

---

## 📁 What Was Built

### New Files
- ✅ `server/services/slack-sync.js` - Sync service
- ✅ `docs/features/SLACK_INTEGRATION_GUIDE.md` - Full docs
- ✅ `SLACK_QUICKSTART.md` - Quick reference
- ✅ `SLACK_INTEGRATION_SUMMARY.md` - Implementation details
- ✅ `setup-slack.sh` - Setup script

### Modified Files
- ✅ `server/index.js` - Added `/api/sync/slack` endpoint
- ✅ `src/pages/ConnectedSources.tsx` - Enabled Slack sync
- ✅ `package.json` - Added `@slack/web-api` + npm scripts
- ✅ `env.example` - Added ngrok instructions

### Dependencies Added
- ✅ `@slack/web-api` - Slack SDK for Node.js

---

## 🎯 Key Features

### What You Can Now Do
- ✅ Connect Slack workspace via OAuth
- ✅ Sync messages from channels, DMs, group DMs
- ✅ Search Slack messages semantically
- ✅ Include thread replies with parent messages
- ✅ Cross-source search (Slack + Drive + Notion)
- ✅ View sync stats per source
- ✅ Disconnect and clear Slack data

### What Gets Indexed
- ✅ Public channels (where app is invited)
- ✅ Private channels (where app is invited)
- ✅ Direct messages
- ✅ Group DMs
- ✅ Message threads
- ✅ Last 30 days of messages
- ✅ Up to 20 conversations

---

## 📚 Documentation

- **Quick Start:** `SLACK_QUICKSTART.md` (this file)
- **Full Guide:** `docs/features/SLACK_INTEGRATION_GUIDE.md`
- **Summary:** `SLACK_INTEGRATION_SUMMARY.md`

---

## 🚀 You're All Set!

The Slack integration is **complete and ready to test**!

Start with Step 1 above and follow through Step 5 to get everything running.

**Questions?** Check the troubleshooting section or the full documentation.

---

**Happy Searching!** 🎉

