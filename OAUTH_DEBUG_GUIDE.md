# OAuth Connection Debugging Guide

## Issues Fixed

### 1. Google Drive OAuth
- ✅ **Fixed**: Created missing `/api/auth/drive/callback` route
- ✅ **Fixed**: Updated redirect URI to use correct endpoint
- ✅ **Fixed**: Updated state parameter to match callback validation

### 2. Slack OAuth
- ✅ **Fixed**: Added fallback redirect URI configuration
- ✅ **Fixed**: Made redirect URI configurable via environment variable

### 3. Notion OAuth
- ✅ **Fixed**: Added fallback redirect URI configuration
- ✅ **Fixed**: Made redirect URI configurable via environment variable

## Testing the Connections

### Option 1: Use Mock Routes (Recommended for Development)
For testing without setting up real OAuth apps:

```bash
# Test Slack connection
curl http://localhost:8080/api/auth/slack/mock

# Test Notion connection  
curl http://localhost:8080/api/auth/notion/mock

# Test Google Drive connection
curl http://localhost:8080/api/auth/drive/mock
```

### Option 2: Set Up Real OAuth Apps

#### Google Drive Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client IDs
5. Set authorized redirect URI: `http://localhost:8080/api/auth/drive/callback`
6. Copy Client ID and Secret to your `.env.local` file

#### Slack Setup:
1. Go to [Slack API](https://api.slack.com/apps)
2. Create New App > From scratch
3. Go to OAuth & Permissions
4. Add redirect URL: `http://localhost:8080/api/auth/slack/callback`
5. Add scopes: `channels:read`, `channels:history`, `groups:read`, `groups:history`, `im:read`, `im:history`, `mpim:read`, `mpim:history`, `files:read`, `users:read`, `users:read.email`, `team:read`
6. Copy Client ID and Secret to your `.env.local` file

#### Notion Setup:
1. Go to [Notion Developers](https://www.notion.so/my-integrations)
2. Create new integration
3. Set redirect URI: `http://localhost:8080/api/auth/notion/callback`
4. Copy Client ID and Secret to your `.env.local` file

## Environment Variables Required

Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Slack OAuth
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:8080/api/auth/slack/callback

# Notion OAuth
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret
NOTION_REDIRECT_URI=http://localhost:8080/api/auth/notion/callback

# App
NEXT_PUBLIC_APP_URL=http://localhost:8080
```

## Common Issues and Solutions

### 1. "OAuth not configured" Error
- **Cause**: Missing environment variables
- **Solution**: Check that all required environment variables are set in `.env.local`

### 2. "Invalid OAuth state" Error
- **Cause**: State parameter mismatch between connect and callback routes
- **Solution**: Ensure state parameters match exactly

### 3. "Token exchange failed" Error
- **Cause**: Invalid client credentials or redirect URI mismatch
- **Solution**: Verify client ID/secret and redirect URI in OAuth app settings

### 4. "Database error" Error
- **Cause**: Supabase connection issues or missing user_connections table
- **Solution**: Check Supabase configuration and ensure database is set up

### 5. Connections not showing as connected
- **Cause**: Database query issues or incorrect source type mapping
- **Solution**: Check database logs and verify source_type values match

## Debugging Steps

1. **Check Environment Variables**:
   ```bash
   # In your terminal, verify all required env vars are set
   echo $GOOGLE_CLIENT_ID
   echo $SLACK_CLIENT_ID
   echo $NOTION_CLIENT_ID
   ```

2. **Test OAuth Endpoints**:
   ```bash
   # Test each OAuth connect endpoint
   curl -I http://localhost:8080/api/auth/google/connect
   curl -I http://localhost:8080/api/auth/slack/connect
   curl -I http://localhost:8080/api/auth/notion/connect
   ```

3. **Check Database Connection**:
   ```bash
   # Test connections API
   curl http://localhost:8080/api/connections/get
   ```

4. **View Logs**:
   - Check browser console for client-side errors
   - Check server logs for OAuth flow errors
   - Check Supabase logs for database errors

## Next Steps

1. Set up your OAuth apps with the correct redirect URIs
2. Add your credentials to `.env.local`
3. Test the connections using the mock routes first
4. Then test with real OAuth flows
5. Check the connections page to verify they show as connected

The OAuth connections should now work properly with the fixes applied!
