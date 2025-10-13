# 🚀 LocalTunnel Setup - Permanent URL!

## ✅ Setup Complete!

Your Haven7 app now uses **LocalTunnel** instead of ngrok for a **permanent, never-changing HTTPS URL**.

---

## 🎯 Your Permanent URL

```
https://haven7-searcher.loca.lt
```

**This URL NEVER CHANGES!** Use it everywhere:
- Slack OAuth redirect URIs
- Google Drive OAuth redirect URIs  
- Notion OAuth redirect URIs

---

## 🔧 What Was Configured

### 1. LocalTunnel Installed
```bash
npm install -g localtunnel
```

### 2. LocalTunnel Running in Background
```bash
lt --port 3000 --subdomain haven7-searcher
```

### 3. Environment Variables Updated

`.env.local` now has:
```bash
VITE_API_URL=https://haven7-searcher.loca.lt
API_BASE_URL=https://haven7-searcher.loca.lt
```

### 4. Documentation Updated

All markdown files updated to reference LocalTunnel instead of ngrok:
- ✅ `GET_OAUTH_CREDENTIALS.md`
- ✅ `docs/NEXT_STEPS.md`
- ✅ `docs/setup/SLACK_QUICKSTART.md`
- ✅ `docs/features/SLACK_INTEGRATION_GUIDE.md`
- ✅ `docs/features/SLACK_INTEGRATION_SUMMARY.md`

---

## 📋 OAuth Redirect URIs to Update

Update these in your service consoles:

### Slack
**URL:** https://api.slack.com/apps/A09L0GZBBC5/oauth

**Redirect URI:**
```
https://haven7-searcher.loca.lt/api/auth/slack/callback
```

### Google Drive
**URL:** https://console.cloud.google.com/apis/credentials

**Redirect URI:**
```
https://haven7-searcher.loca.lt/api/auth/google/callback
```

### Notion
**URL:** https://www.notion.so/my-integrations

**Redirect URI:**
```
https://haven7-searcher.loca.lt/api/auth/notion/callback
```

---

## 🎯 How to Use

### Start Development Server
```bash
npm run dev
```

LocalTunnel automatically runs in the background!

### Check LocalTunnel Status
```bash
# Your URL is always: https://haven7-searcher.loca.lt
curl -I https://haven7-searcher.loca.lt
```

### Restart LocalTunnel (if needed)
```bash
# Kill existing
pkill -f localtunnel

# Restart
lt --port 3000 --subdomain haven7-searcher &
```

---

## ⚠️ First-Time Warning

When you (or users) visit `https://haven7-searcher.loca.lt` for the first time, LocalTunnel shows a warning page.

**Just click "Continue"** - this only happens once per browser.

---

## 🆚 LocalTunnel vs ngrok

| Feature | LocalTunnel | ngrok (old) |
|---------|-------------|-------------|
| **URL Changes** | Never ✅ | Every restart ❌ |
| **Cost** | Free ✅ | Free (but URL changes) |
| **Setup** | 1 command ✅ | Multiple steps ❌ |
| **Permanent subdomain** | Yes ✅ | Paid only ❌ |
| **Reconnection** | Automatic ✅ | Manual ❌ |

---

## 🐛 Troubleshooting

### LocalTunnel not responding
```bash
# Restart LocalTunnel
pkill -f "lt --port"
lt --port 3000 --subdomain haven7-searcher &
```

### "This site can't be reached"
```bash
# Make sure your dev server is running
npm run dev
```

### Want a different subdomain?
```bash
# Stop current tunnel
pkill -f "lt --port"

# Start with new subdomain
lt --port 3000 --subdomain your-new-name

# Update .env.local with new URL
```

---

## 📚 References

- **LocalTunnel Docs:** https://github.com/localtunnel/localtunnel
- **Your Tunnel:** https://haven7-searcher.loca.lt

---

## 🎉 Benefits

✅ **No more changing URLs** - update OAuth settings once  
✅ **Free forever** - no paid plans needed  
✅ **Auto-reconnects** - handles network drops  
✅ **Simple setup** - one command  
✅ **Background process** - runs automatically  

---

**Your permanent URL:** `https://haven7-searcher.loca.lt` 🚀

