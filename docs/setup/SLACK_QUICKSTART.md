# 🚀 Slack Integration - Quick Start

**5-Minute Setup Guide**

---

## ⚡ Quick Setup

### Step 1: Configure Credentials
```bash
./setup-slack.sh
```
This adds your Slack credentials to `.env.local`

### Step 2: Start ngrok
```bash
npm run ngrok
```
Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Step 3: Update Environment
Edit `.env.local`:
```bash
VITE_API_URL=https://abc123.ngrok.io
API_BASE_URL=https://abc123.ngrok.io
```

### Step 4: Update Slack App
1. Go to: https://api.slack.com/apps/A09L0GZBBC5
2. OAuth & Permissions → Redirect URLs
3. Add: `https://abc123.ngrok.io/api/auth/slack/callback`
4. Save

### Step 5: Start Servers
```bash
# In one terminal (keep ngrok running)
npm run ngrok

# In another terminal
npm run dev
```

### Step 6: Test
1. Open http://localhost:8080
2. Go to **Connect Sources**
3. Click **Connect** on Slack
4. Authorize your workspace
5. Click **Sync Documents**
6. Search your Slack messages!

---

## 📋 Your Credentials

```
App ID: A09L0GZBBC5
Client ID: 9686909204692.9680577385413
Client Secret: 843eda4877df61a3461a441cb13c58f8
```

---

## 🎯 What Gets Indexed

- ✅ Public channels (app must be added)
- ✅ Private channels (app must be added)  
- ✅ Direct messages
- ✅ Group DMs
- ✅ Message threads
- ✅ Last 30 days of messages

**To index a channel:** `/invite @YourAppName` in that channel

---

## 🔧 Available Commands

```bash
npm run setup:slack    # Configure Slack credentials
npm run ngrok          # Start ngrok tunnel
npm run dev            # Start frontend + API
npm run dev:all        # Start everything (frontend + API + ngrok)
```

---

## 🐛 Common Issues

### "redirect_uri_mismatch"
→ Make sure Slack app has the ngrok URL in OAuth settings

### "No conversations found"
→ Add the app to channels: `/invite @YourAppName`

### ngrok URL keeps changing
→ Keep ngrok running, or get a paid account for permanent URL

### "Token expired"
→ Reconnect Slack from the Connect Sources page

---

## 📚 Full Documentation

See: `docs/features/SLACK_INTEGRATION_GUIDE.md`

---

**Need Help?** Check the troubleshooting section in the full guide!

