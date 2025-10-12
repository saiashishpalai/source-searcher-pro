# Supabase Authentication & OAuth Setup Guide

## 🔧 Required Supabase Dashboard Configuration

### 1. **Authentication Settings**

Go to: `https://supabase.com/dashboard/project/wjqlqmepnpvaywfbfpxb/auth/settings`

#### Email Auth Configuration:
- ✅ **Enable email provider** (should be enabled by default)
- ✅ **Confirm email** (optional - set based on your requirements)
- ✅ **Secure email change** (recommended)

#### Site URL Configuration:
- **Development**: `http://localhost:5173`
- **Production**: `https://yourdomain.com` (update when deploying)

#### Redirect URLs (Add these):
```
http://localhost:5173/**
http://localhost:5173/auth/callback
http://localhost:8080/**
http://localhost:8080/auth/callback
https://yourdomain.com/** (for production)
https://yourdomain.com/auth/callback (for production)
```

#### JWT Settings:
- **JWT Expiry**: 3600 seconds (1 hour) - default is fine
- ✅ **Refresh Token Rotation**: Enable (recommended for security)

### 2. **OAuth Provider Configuration**

Go to: `https://supabase.com/dashboard/project/wjqlqmepnpvaywfbfpxb/auth/providers`

#### Google Provider Setup:
1. **Enable Google provider**
2. **Client ID**: Get from Google Cloud Console
3. **Client Secret**: Get from Google Cloud Console
4. **Redirect URL**: `https://wjqlqmepnpvaywfbfpxb.supabase.co/auth/v1/callback`

#### Google Cloud Console Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Credentials**
3. Create OAuth 2.0 Client ID (if not exists)
4. **Authorized redirect URIs** (add these):
   ```
   https://wjqlqmepnpvaywfbfpxb.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback
   http://localhost:8080/auth/callback
   ```

#### Slack Provider Setup:
1. **Enable Slack provider** (if available in Supabase)
2. **Client ID**: Get from Slack App Settings
3. **Client Secret**: Get from Slack App Settings
4. **Redirect URL**: `https://wjqlqmepnpvaywfbfpxb.supabase.co/auth/v1/callback`

#### Slack App Configuration:
1. Go to [Slack API](https://api.slack.com/apps)
2. Select your app > **OAuth & Permissions**
3. **Redirect URLs** (add these):
   ```
   https://wjqlqmepnpvaywfbfpxb.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback
   http://localhost:8080/auth/callback
   ```

#### Notion Provider Setup:
1. **Enable Notion provider** (if available in Supabase)
2. **Client ID**: Get from Notion Integration
3. **Client Secret**: Get from Notion Integration
4. **Redirect URL**: `https://wjqlqmepnpvaywfbfpxb.supabase.co/auth/v1/callback`

#### Notion Integration Configuration:
1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create new integration
3. **Redirect URLs** (add these):
   ```
   https://wjqlqmepnpvaywfbfpxb.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback
   http://localhost:8080/auth/callback
   ```

### 3. **Database Configuration**

Go to: `https://supabase.com/dashboard/project/wjqlqmepnpvaywfbfpxb/sql`

#### Run the Database Schema:
Execute the SQL from `database-schema-fix.sql` in the Supabase SQL Editor:

```sql
-- This will create the proper user_connections and integrations tables
-- with Row Level Security policies
```

### 4. **Environment Variables**

#### Required in Supabase Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`: `https://wjqlqmepnpvaywfbfpxb.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJhbGc...GAVIOM`
- `SUPABASE_SERVICE_ROLE_KEY`: (get from Project Settings > API)

#### Required for OAuth (if using custom OAuth):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`

### 5. **Testing Checklist**

#### Authentication Flow:
- [ ] User can sign up with email/password
- [ ] User receives email confirmation (if enabled)
- [ ] User can log in with email/password
- [ ] Session persists after browser refresh
- [ ] User can log out successfully

#### OAuth Flow:
- [ ] Google OAuth redirects to Google consent screen
- [ ] Google OAuth redirects back to app after consent
- [ ] Slack OAuth redirects to Slack consent screen
- [ ] Slack OAuth redirects back to app after consent
- [ ] Notion OAuth redirects to Notion consent screen
- [ ] Notion OAuth redirects back to app after consent

#### Database Integration:
- [ ] OAuth connections are stored in `user_connections` table
- [ ] User can see connected sources in dashboard
- [ ] User can disconnect sources
- [ ] Row Level Security policies work correctly

### 6. **Troubleshooting**

#### Common Issues:

**"Invalid redirect URI" Error:**
- Check that redirect URIs in OAuth provider match Supabase callback URL
- Ensure no trailing slashes in URLs

**"Client ID not found" Error:**
- Verify OAuth provider is enabled in Supabase Dashboard
- Check environment variables are set correctly

**"Unauthorized" Error:**
- Check Row Level Security policies are correctly configured
- Verify user is authenticated before making database calls

**Session not persisting:**
- Check Site URL and Redirect URLs in Supabase Dashboard
- Verify JWT expiry settings

### 7. **Production Deployment**

When deploying to production:

1. **Update Site URL** in Supabase Dashboard to your production domain
2. **Add production redirect URLs** to OAuth providers
3. **Update environment variables** in your deployment platform
4. **Test OAuth flows** in production environment
5. **Verify SSL certificates** are working

---

## 🎯 Quick Setup Commands

```bash
# 1. Copy environment variables
cp env.example .env.local

# 2. Run database schema
# Execute database-schema-fix.sql in Supabase SQL Editor

# 3. Test locally
npm run dev

# 4. Test OAuth flows
# Visit http://localhost:5173/connect-sources
# Click on Google Drive, Slack, or Notion connect buttons
```

## 📞 Support

If you encounter issues:
1. Check Supabase Dashboard logs
2. Check browser console for errors
3. Verify OAuth provider configurations
4. Test with mock OAuth endpoints first
