# User OAuth Setup Guide

## Overview

Haven7 now supports user-provided OAuth credentials! This means each user creates their own OAuth apps for Google Drive, Slack, and Notion, giving them full control over their data and avoiding shared rate limits.

## Benefits

- **Your Data, Your Control**: You own the OAuth app, so you control data access
- **No Shared Rate Limits**: Your API quota is yours alone
- **Better Security**: Credentials are encrypted and stored per-user
- **Free to Use**: Creating OAuth apps is free for all providers

## Setup Instructions

### Google Drive Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Sign in with your Google account

2. **Create a New Project** (if you don't have one)
   - Click "Select a project" → "New Project"
   - Name it something like "Haven7 Personal"
   - Click "Create"

3. **Enable Google Drive API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

4. **Create OAuth 2.0 Client ID**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Name it "Haven7"

5. **Configure Redirect URI**
   - Under "Authorized redirect URIs", add:
     - Development: `http://localhost:3000/api/auth/googleDrive/callback`
     - Production: `https://your-backend-url.com/api/auth/googleDrive/callback`
   
6. **Copy Your Credentials**
   - Copy the **Client ID**
   - Copy the **Client Secret**
   - You'll enter these in Haven7

7. **Configure OAuth Consent Screen** (if prompted)
   - User Type: External
   - Add your email as a test user
   - Scopes: Just use the defaults

### Slack Setup

1. **Go to Slack API Apps**
   - Visit: https://api.slack.com/apps
   - Sign in to your Slack workspace

2. **Create New App**
   - Click "Create New App"
   - Choose "From scratch"
   - Name: "Haven7"
   - Choose your workspace
   - Click "Create App"

3. **Configure OAuth & Permissions**
   - In the left sidebar, click "OAuth & Permissions"
   - Scroll to "Redirect URLs"
   - Click "Add New Redirect URL"
   - Add:
     - Development: `http://localhost:3000/api/auth/slack/callback`
     - Production: `https://your-backend-url.com/api/auth/slack/callback`
   - Click "Save URLs"

4. **Add Bot Token Scopes**
   - Scroll down to "Scopes" section
   - Under "Bot Token Scopes", add:
     - `channels:history`
     - `channels:read`
     - `files:read`
     - `groups:history`
     - `groups:read`
     - `im:history`
     - `im:read`
     - `mpim:history`
     - `mpim:read`
     - `users:read`
     - `users:read.email`
     - `team:read`
     - `usergroups:read`

5. **Add User Token Scopes**
   - Under "User Token Scopes", add:
     - `identity.basic`
     - `identity.email`

6. **Copy Your Credentials**
   - Scroll to top of "OAuth & Permissions" page
   - OR go to "Basic Information" in sidebar
   - Under "App Credentials", copy:
     - **Client ID**
     - **Client Secret**

### Notion Setup

1. **Go to Notion Integrations**
   - Visit: https://www.notion.so/my-integrations
   - Sign in to your Notion account

2. **Create New Integration**
   - Click "+ New integration"
   - Name: "Haven7"
   - Select your workspace
   - Click "Submit"

3. **Configure Integration**
   - Type: Select "Public" (not Internal)
   - Under "OAuth Domain & URIs":
   - Add Redirect URI:
     - Development: `http://localhost:3000/api/auth/notion/callback`
     - Production: `https://your-backend-url.com/api/auth/notion/callback`

4. **Set Capabilities**
   - Check the following:
     - ✓ Read content
     - ✓ Read comments  
     - ✓ Read user information including email addresses

5. **Copy Your Credentials**
   - Scroll to "OAuth Domain & URIs" section
   - Copy:
     - **OAuth client ID**
     - **OAuth client secret**

## Using Your OAuth Credentials in Haven7

1. **Navigate to Connect Sources**
   - Log into Haven7
   - Go to "Connect Sources" page

2. **Click "Connect" on Any Provider**
   - Click "Connect" for Google Drive, Slack, or Notion
   - You'll see a dialog asking for OAuth credentials

3. **Enter Your Credentials**
   - Paste your **Client ID**
   - Paste your **Client Secret**
   - The **Redirect URI** will be pre-filled (verify it matches what you configured)

4. **Save & Continue**
   - Click "Save & Continue"
   - You'll be redirected to the provider's OAuth consent screen
   - Grant the requested permissions
   - You'll be redirected back to Haven7

5. **Start Syncing!**
   - Your connection is now active
   - Click "Sync" to index your data

## Security Notes

- **Client Secrets are Encrypted**: Your client secret is encrypted using Supabase's pgsodium encryption before storage
- **Stored Per-User**: Your credentials are only accessible by your account
- **Never Shared**: We never share your credentials with other users
- **Decryption Server-Side**: Client secrets are only decrypted on the backend during OAuth flows

## Troubleshooting

### "Token exchange failed" Error

- **Check Redirect URI**: Ensure the redirect URI in your OAuth app exactly matches what Haven7 is using
- **Verify Credentials**: Double-check that you copied the correct Client ID and Client Secret
- **Check Scopes**: Ensure all required scopes are enabled in your OAuth app

### "No credentials found" Error

- This means you haven't configured OAuth credentials yet
- Click "Connect" again and enter your credentials in the dialog

### Updating Credentials

To update your OAuth credentials:
1. Go to Profile Settings
2. Navigate to "Integrations" tab
3. Find the provider you want to update
4. Click "Update Credentials"
5. Enter your new credentials

## FAQ

**Q: Do I need to create separate OAuth apps for each provider?**
A: Yes, you need one OAuth app for Google, one for Slack, and one for Notion.

**Q: Can I use the same OAuth app for multiple Haven7 accounts?**
A: Technically yes, but we recommend creating separate apps for better isolation.

**Q: What happens to my existing connections?**
A: If you had connections before this update, you'll need to reconnect and provide your own OAuth credentials.

**Q: Can I share my OAuth app with teammates?**
A: While possible, we recommend each user creates their own OAuth app for better security and isolation.

**Q: Is there a cost to creating OAuth apps?**
A: No, creating OAuth apps is completely free for all three providers.

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your OAuth app configuration
3. Check the browser console for error messages
4. Contact support with the error details

