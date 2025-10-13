# 🎯 OAuth Integration - Ready to Test!

**All code is complete!** Here's exactly what to do next:

---

## ⚡ Quick Start (5 Steps)

### Step 1: Set Up Local HTTPS

1. **Install mkcert** (if not already installed):
   ```bash
   brew install mkcert
   ```

2. **Install the local CA** (one-time setup):
   ```bash
   sudo mkcert -install
   ```

3. **Generate SSL certificates**:
   ```bash
   mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1
   ```

See [HTTPS Setup Guide](./setup/HTTPS_SETUP.md) for detailed instructions.

---

### Step 2: Configure Environment Variables

Your `.env.local` should have:

```bash
# HTTPS URLs for local development
VITE_API_URL=https://localhost:3000
API_BASE_URL=https://localhost:3000
VITE_APP_URL=https://localhost:8080

# OAuth Client IDs (for frontend)
VITE_SLACK_CLIENT_ID=your_slack_client_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_NOTION_CLIENT_ID=your_notion_client_id

# OAuth Client Secrets (for backend)
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret

# Other required keys
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

---

### Step 3: Configure OAuth Redirect URIs

All three services use the same pattern: `https://localhost:3000/api/auth/[source]/callback`

#### Slack
1. Go to: https://api.slack.com/apps → Your App → OAuth & Permissions
2. Under **Redirect URLs**, add:
   ```
   https://localhost:3000/api/auth/slack/callback
   ```
3. Click **Save URLs**

#### Google Drive
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://localhost:3000/api/auth/google/callback
   ```
4. Click **Save**

#### Notion
1. Go to: https://www.notion.so/my-integrations
2. Select your integration
3. Under **Redirect URIs**, add:
   ```
   https://localhost:3000/api/auth/notion/callback
   ```
4. Click **Save**

---

### Step 4: Start Your Application

```bash
npm run dev
```

This starts both:
- Frontend: `https://localhost:8080`
- Backend API: `https://localhost:3000`

---

### Step 5: Test the Integration

1. Open browser to: **https://localhost:8080**
2. Log in to your Haven7 account
3. Click **Connect Sources** in the navigation
4. Connect each service:
   - **Slack**: Click Connect → Authorize workspace
   - **Google Drive**: Click Connect → Sign in with Google
   - **Notion**: Click Connect → Authorize Notion
5. After connecting, click **Sync Documents** to fetch content

**✅ Success:** All three services show "Connected" with document counts

---

## 🔧 Troubleshooting

### "ERR_SSL_PROTOCOL_ERROR"
- Ensure mkcert CA is installed: `sudo mkcert -install`
- Restart your browser after installing the CA
- Check that both frontend and backend are running

### "redirect_uri_mismatch"
- Verify the redirect URI in your OAuth app settings exactly matches:
  - `https://localhost:3000/api/auth/[source]/callback`
- Make sure you clicked "Save" after adding the URI
- Clear browser cache and try again

### "Not Secure" warning
- Ensure you ran `sudo mkcert -install`
- Restart your browser
- Check that certificates exist: `ls -la localhost*.pem`

---

## 📚 Additional Resources

- [HTTPS Setup Guide](./setup/HTTPS_SETUP.md) - Detailed mkcert setup
- [Slack Integration](./features/SLACK_INTEGRATION_GUIDE.md) - Complete Slack setup
- [Environment Setup](./setup/LOVABLE_ENV_SETUP.md) - Environment variables guide
- [OAuth Debug Guide](../authentication/OAUTH_DEBUG_GUIDE.md) - Troubleshooting OAuth

---

## ✨ What's Working

✅ **Local HTTPS** - Secure local development with mkcert  
✅ **OAuth 2.0** - Secure authentication for all platforms  
✅ **Unified Redirect URIs** - All services use `https://localhost:3000`  
✅ **Connect/Disconnect** - Full lifecycle management  
✅ **Document Sync** - Automatic content indexing  
✅ **Search** - Unified search across all sources  
✅ **AI Summaries** - GPT-4 powered result summaries  

---

**Ready to build amazing features!** 🚀
