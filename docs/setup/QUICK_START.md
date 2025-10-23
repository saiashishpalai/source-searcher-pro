# Quick Start Guide

Get Haven7 up and running in minutes with this step-by-step guide.

## 🚀 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account
- OAuth credentials for Google, Slack, and Notion
- An OpenAI API key

## ⚡ 5-Minute Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/saiashishpalai/source-searcher-pro.git
cd source-searcher-pro

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env.local

# Edit with your credentials
nano .env.local
```

**Required Environment Variables:**

```bash
# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# URLs
VITE_API_URL=http://localhost:3000
VITE_APP_URL=http://localhost:8081
```

### 3. Database Setup

1. **Create Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Create new project
   - Copy URL and API keys

2. **Run Database Migrations**
   - Go to SQL Editor in Supabase
   - Run `database/fixes/fix-user-connections-table.sql`
   - Run `database/fixes/add-token-expires-column.sql`

### 4. OAuth Setup

#### Google Drive
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add redirect URI: `http://localhost:3000/api/auth/google/callback`

#### Slack
1. Go to [Slack API Dashboard](https://api.slack.com/apps)
2. Create new app
3. Add redirect URL: `http://localhost:3000/api/auth/slack/callback`
4. Add scopes: `channels:read`, `channels:history`, `files:read`, `users:read`, `team:read`

#### Notion
1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create new integration
3. Add redirect URI: `http://localhost:3000/api/auth/notion/callback`

### 5. Start Development

```bash
# Start backend server
npm run server

# In another terminal, start frontend
npm run dev
```

**Your app will be available at:**
- Frontend: http://localhost:8081
- Backend: http://localhost:3000

## 🧪 Test the Integration

1. **Open the app** at http://localhost:8081
2. **Sign up/Login** with your account
3. **Connect Google Drive** - Click "Connect" and authorize
4. **Connect Slack** - Click "Connect" and authorize
5. **Connect Notion** - Click "Connect" and authorize
6. **Test search** - Try searching across your connected sources

## 🔧 Troubleshooting

### Common Issues

**"OAuth not configured"**
- Check environment variables are set correctly
- Verify OAuth app settings match your URLs

**"Database error"**
- Ensure Supabase project is created
- Run database migration scripts
- Check RLS policies are enabled

**"Connection failed"**
- Verify redirect URIs match exactly
- Check OAuth scopes are correct
- Test with debug endpoints

### Debug Endpoints

```bash
# Check backend health
curl http://localhost:3000/api/health

# Check environment variables
curl http://localhost:3000/api/debug/env

# Test database connection
curl http://localhost:3000/api/debug/db-test
```

## 📚 Next Steps

Once you have the basic setup working:

1. **Read the full documentation** in the `docs/` directory
2. **Set up production deployment** using the [Deployment Guide](deployment/DEPLOYMENT_GUIDE.md)
3. **Configure OAuth for production** using the [OAuth Setup Guide](authentication/SUPABASE_AUTH_SETUP_GUIDE.md)
4. **Explore advanced features** like search customization and sync optimization

## 🆘 Need Help?

- **Documentation**: Check the `docs/` directory for detailed guides
- **Issues**: Create a GitHub issue with detailed information
- **Debug**: Use the debug endpoints to troubleshoot issues

## 🎉 You're Ready!

Your Haven7 instance should now be running locally with all OAuth integrations working. You can search across your Google Drive, Slack, and Notion content seamlessly!