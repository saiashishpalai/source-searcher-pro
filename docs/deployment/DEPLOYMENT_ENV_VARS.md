# Deployment Environment Variables Guide

## Required Environment Variables (Updated)

After the user-provided OAuth credentials update, the deployment environment variables have been significantly simplified.

## Backend (Render/Vercel) - REQUIRED

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI API Key (for embeddings and RAG)
OPENAI_API_KEY=your-openai-api-key-here

# Server Configuration (optional, defaults to 3000)
PORT=3000

# App URL (for OAuth redirects)
VITE_APP_URL=https://your-frontend-url.com
API_BASE_URL=https://your-backend-url.com
```

## Frontend (Vercel/Netlify) - REQUIRED

```bash
# Supabase Configuration  
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# API URL
VITE_API_BASE_URL=https://your-backend-url.com
```

## REMOVED Environment Variables

The following OAuth-related environment variables are **NO LONGER NEEDED**:

### ❌ REMOVED - No longer required:
```bash
# Google OAuth (REMOVED)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
VITE_GOOGLE_CLIENT_ID=...

# Slack OAuth (REMOVED)
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
VITE_SLACK_CLIENT_ID=...

# Notion OAuth (REMOVED)
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
VITE_NOTION_CLIENT_ID=...
```

## Why Were They Removed?

Haven7 now uses **user-provided OAuth credentials**. Each user creates their own OAuth apps and provides credentials through the UI. This provides:

1. **Better Security**: Each user controls their own OAuth apps
2. **No Shared Rate Limits**: Users don't compete for API quota
3. **Data Control**: Users own and control their OAuth apps
4. **Simplified Deployment**: Fewer env vars to manage

## Migration Steps

If you're updating an existing deployment:

### Step 1: Update Backend Environment Variables

1. Go to your backend hosting dashboard (Render/Vercel)
2. Navigate to Environment Variables
3. **Remove** all OAuth credential variables listed above
4. **Keep** only the required variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `API_BASE_URL`
   - `VITE_APP_URL`

### Step 2: Deploy Backend

1. Deploy the updated code to your backend
2. Wait for deployment to complete
3. Test health endpoint: `https://your-backend-url.com/api/health`

### Step 3: Run Database Migrations

**CRITICAL: Run these in order!**

1. **Backup database first:**
   ```sql
   -- In Supabase SQL Editor, run:
   -- database/backups/pre-oauth-migration-backup.sql
   ```

2. **Run migration:**
   ```sql
   -- In Supabase SQL Editor, run:
   -- database/migrations/user-oauth-credentials-migration.sql
   ```

3. **Verify migration:**
   - Check that new columns exist in `user_connections` table
   - Verify encryption functions created
   - Confirm backup tables created

### Step 4: Update Frontend

1. Go to your frontend hosting dashboard (Vercel/Netlify)
2. Remove OAuth env variables (if any)
3. Deploy updated frontend code

### Step 5: Test End-to-End

1. Log into Haven7 as a user
2. Try to connect Google Drive
3. Should see "OAuth Credentials" dialog
4. Enter test credentials and verify flow works

## Rollback Plan

If something goes wrong:

1. **Rollback Database:**
   ```sql
   -- In Supabase SQL Editor, run:
   -- database/backups/rollback-oauth-migration.sql
   ```

2. **Revert Code:**
   - Revert backend to previous commit
   - Revert frontend to previous commit
   - Re-add OAuth env variables

3. **Verify:**
   - Test that old OAuth flow still works
   - Check that existing connections work

## Security Notes

### Encryption

- Client secrets are encrypted using Supabase's `pgsodium` extension
- Encryption keys are managed by Supabase Vault (separate from database)
- Decryption only happens server-side during OAuth flows

### Row Level Security (RLS)

- Users can only access their own OAuth credentials
- RLS policies enforce per-user isolation
- Service role bypasses RLS for server-side operations

## Monitoring

After deployment, monitor:

1. **Error Logs**: Check for OAuth-related errors
2. **Database**: Monitor new columns for usage
3. **User Feedback**: Watch for connection issues

## Support

If users have issues:

1. Direct them to: `docs/setup/USER_OAUTH_SETUP_GUIDE.md`
2. Common issues:
   - Redirect URI mismatch
   - Wrong scopes configured
   - Client ID/Secret copied incorrectly

## FAQ

**Q: What happens to existing user connections?**
A: Existing connections will stop working. Users must reconnect with their own OAuth credentials.

**Q: Can I still use shared OAuth credentials?**
A: No, the system now requires per-user credentials. This is by design for better security.

**Q: What if a user doesn't want to create OAuth apps?**
A: Creating OAuth apps is required to use Haven7. They're free and take 5-10 minutes to set up.

**Q: Do I need to update anything on Render?**
A: Yes, remove the OAuth env variables from your Render dashboard and redeploy.

## Next Steps

After deployment:
1. Test with your own account
2. Create test OAuth apps to verify flow
3. Update user documentation/onboarding
4. Monitor for any issues

