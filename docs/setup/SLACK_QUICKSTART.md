# 🚀 Slack Integration - Quick Start

**5-Minute Setup Guide**

---

## ⚡ Quick Setup

### Step 1: Configure Credentials
```bash
./setup-slack.sh
```
This adds your Slack credentials to `.env.local`

### Step 2: mkcert HTTPS Already Configured! ✅
Your local HTTPS URLs are:
```
API: https://localhost:3000
Frontend: https://localhost:8082
```
These URLs work with valid SSL certificates - no external tunneling needed!

### Step 3: Environment Already Configured! ✅
Your `.env.local` already has:
```bash
VITE_API_URL=https://localhost:3000
API_BASE_URL=https://localhost:3000
```

### Step 4: Update Slack App (One Time Only)
1. Go to: https://api.slack.com/apps/A09L0GZBBC5
2. OAuth & Permissions → Redirect URLs
3. Add: `https://haven7-searcher.loca.lt/api/auth/slack/callback`
4. Save

### Step 5: Start Server
```bash
npm run dev
```
mkcert certificates work automatically with localhost!

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
Client ID: your_slack_client_id_here
Client Secret: your_slack_client_secret_here
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
npm run dev            # Start frontend + API (mkcert HTTPS auto-configured)
```

---

## 🐛 Common Issues

### "redirect_uri_mismatch"
→ Make sure Slack app has `https://localhost:3000/api/auth/slack/callback` in OAuth settings

### "No conversations found"
→ Add the app to channels: `/invite @YourAppName`

### Browser shows SSL certificate warning
→ Click "Continue" on first visit - this is normal and only happens once

### "Token expired"
→ Reconnect Slack from the Connect Sources page

---

## 📚 Full Documentation

See: `docs/features/SLACK_INTEGRATION_GUIDE.md`

---

**Need Help?** Check the troubleshooting section in the full guide!

