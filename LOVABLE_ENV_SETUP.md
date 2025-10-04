# Lovable Environment Setup Guide

## Issue Fixed
The app was failing with "Missing required Supabase environment variables" error in Lovable deployment.

## Solution Applied
Updated Supabase configuration files to use fallback values when environment variables are not available, preventing the app from crashing.

## Environment Variables Needed for Full Functionality

To enable full OAuth functionality in Lovable, you need to set these environment variables in your Lovable project settings:

### Required for OAuth Connections:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Slack OAuth
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret

# Notion OAuth
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-lovable-domain.lovableproject.com
```

## How to Set Environment Variables in Lovable

1. Go to your Lovable project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with its corresponding value
4. Redeploy your project

## Current Status
✅ **App will now load without crashing** - Uses fallback values for demo purposes
⚠️ **OAuth connections will not work** until proper environment variables are set
✅ **Build process works** - No more missing environment variable errors

## Next Steps
1. Set up your Supabase project
2. Configure OAuth apps (Google, Slack, Notion)
3. Add environment variables to Lovable
4. Redeploy to enable full functionality
