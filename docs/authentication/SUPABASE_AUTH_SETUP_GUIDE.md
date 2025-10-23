# OAuth Setup Guide

This guide covers setting up OAuth authentication for Google Drive, Slack, and Notion integrations.

## 🔐 Overview

Haven7 uses OAuth 2.0 to securely connect to your Google Drive, Slack, and Notion accounts. The OAuth flow is handled entirely by the backend, and users simply click "Connect" to authorize access.

## 🚀 Quick Setup

### 1. Google Drive OAuth

1. **Go to Google Cloud Console**
   - Visit: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
   - Select your project or create a new one

2. **Create OAuth 2.0 Credentials**
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "Haven7 Source Searcher"

3. **Configure Redirect URIs**
   ```
   https://source-searcher-pro.onrender.com/api/auth/google/callback
   ```

4. **Get Your Credentials**
   - Copy the Client ID and Client Secret
   - Add them to your environment variables:
     ```
     GOOGLE_CLIENT_ID=your-client-id
     GOOGLE_CLIENT_SECRET=your-client-secret
     ```

### 2. Slack OAuth

1. **Go to Slack API Dashboard**
   - Visit: [https://api.slack.com/apps](https://api.slack.com/apps)
   - Click "Create New App" → "From scratch"

2. **Configure App Settings**
   - App Name: "Haven7 Source Searcher"
   - Development Slack Workspace: Select your workspace

3. **Set OAuth Redirect URLs**
   - Go to "OAuth & Permissions"
   - Add Redirect URL: `https://source-searcher-pro.onrender.com/api/auth/slack/callback`

4. **Configure Bot Token Scopes**
   - Add these OAuth Scopes:
     - `channels:read`
     - `channels:history`
     - `files:read`
     - `users:read`
     - `team:read`

5. **Get Your Credentials**
   - Copy the Client ID and Client Secret
   - Add them to your environment variables:
     ```
     SLACK_CLIENT_ID=your-client-id
     SLACK_CLIENT_SECRET=your-client-secret
     ```

### 3. Notion OAuth

1. **Go to Notion Integrations**
   - Visit: [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Click "New integration"

2. **Configure Integration**
   - Name: "Haven7 Source Searcher"
   - Associated workspace: Select your workspace

3. **Set Redirect URI**
   - Redirect URI: `https://source-searcher-pro.onrender.com/api/auth/notion/callback`

4. **Get Your Credentials**
   - Copy the Client ID and Client Secret
   - Add them to your environment variables:
     ```
     NOTION_CLIENT_ID=your-client-id
     NOTION_CLIENT_SECRET=your-client-secret
     ```

## 🔧 Environment Variables

Add these to your `.env.local` file:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Slack OAuth
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret

# Notion OAuth
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret

# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# URLs
VITE_API_URL=https://source-searcher-pro.onrender.com
VITE_APP_URL=https://source-searcher-pro.vercel.app
```

## 🔄 OAuth Flow

### How It Works

1. **User clicks "Connect"** on a service (Google Drive, Slack, or Notion)
2. **Frontend redirects** to backend OAuth endpoint
3. **Backend redirects** to OAuth provider (Google, Slack, or Notion)
4. **User authorizes** the application on the provider's site
5. **Provider redirects back** to backend callback
6. **Backend exchanges** authorization code for access token
7. **Backend saves** connection to database
8. **User is redirected** back to frontend with success

### Security Features

- **State Parameter**: Prevents CSRF attacks
- **Secure Token Storage**: Tokens encrypted in database
- **Row Level Security**: Users can only access their own connections
- **Token Expiration**: Automatic token refresh handling

## 🛠️ Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Ensure redirect URIs match exactly in OAuth app settings
   - Check for trailing slashes or HTTP vs HTTPS

2. **"Invalid scope"**
   - Verify OAuth scopes are correctly configured
   - Check that scopes are approved in OAuth app settings

3. **"Database error"**
   - Ensure `user_connections` table exists with proper schema
   - Check Supabase connection and RLS policies

4. **"No credentials found"**
   - Verify environment variables are set correctly
   - Check that OAuth credentials are valid

### Debug Endpoints

The backend provides debug endpoints for troubleshooting:

- `GET /api/debug/env` - Check environment variables
- `GET /api/debug/db-test` - Test database connection
- `GET /api/health` - Check backend health

## 📚 Additional Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2)
- [Notion OAuth Documentation](https://developers.notion.com/docs/authorization)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)