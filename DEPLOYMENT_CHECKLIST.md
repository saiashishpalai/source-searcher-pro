# User OAuth Migration - Deployment Checklist

## Pre-Deployment

- [ ] Read `docs/USER_OAUTH_MIGRATION_SUMMARY.md`
- [ ] Read `docs/deployment/DEPLOYMENT_ENV_VARS.md`
- [ ] Understand rollback procedure
- [ ] Backup ready: `database/backups/pre-oauth-migration-backup.sql`
- [ ] Rollback ready: `database/backups/rollback-oauth-migration.sql`

## Database Migration (CRITICAL - DO FIRST!)

### Step 1: Backup
- [ ] Open Supabase SQL Editor
- [ ] Run `database/backups/pre-oauth-migration-backup.sql`
- [ ] Verify backup tables created:
  - [ ] `user_connections_backup_20251023` exists
  - [ ] `profiles_backup_20251023` exists
- [ ] Check `backup_metadata` table has entries
- [ ] Verify row counts match original tables

### Step 2: Run Migration
- [ ] Open Supabase SQL Editor
- [ ] Run `database/migrations/user-oauth-credentials-migration.sql`
- [ ] Verify new columns added:
  - [ ] `client_id` column exists
  - [ ] `client_secret_encrypted` column exists
  - [ ] `redirect_uri` column exists
  - [ ] `credentials_configured_at` column exists
- [ ] Verify encryption functions created:
  - [ ] `encrypt_client_secret` function exists
  - [ ] `decrypt_client_secret` function exists
- [ ] No errors in Supabase logs

## Backend Deployment (Render)

### Step 1: Update Environment Variables
- [ ] Go to Render dashboard
- [ ] Navigate to your backend service
- [ ] Click "Environment" tab
- [ ] **REMOVE** these variables:
  - [ ] GOOGLE_CLIENT_ID
  - [ ] GOOGLE_CLIENT_SECRET
  - [ ] SLACK_CLIENT_ID
  - [ ] SLACK_CLIENT_SECRET
  - [ ] NOTION_CLIENT_ID
  - [ ] NOTION_CLIENT_SECRET
  - [ ] VITE_GOOGLE_CLIENT_ID (if present)
  - [ ] VITE_SLACK_CLIENT_ID (if present)
  - [ ] VITE_NOTION_CLIENT_ID (if present)
- [ ] **VERIFY** these variables still exist:
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] OPENAI_API_KEY
  - [ ] API_BASE_URL (should be your Render backend URL)
  - [ ] VITE_APP_URL (should be your frontend URL)
- [ ] Save changes

### Step 2: Deploy Code
- [ ] Push code to GitHub/GitLab
- [ ] Render auto-deploys (or trigger manual deploy)
- [ ] Wait for "Live" status
- [ ] Check deployment logs for errors

### Step 3: Verify Backend
- [ ] Test health endpoint: `https://your-backend.render.com/api/health`
- [ ] Should return: `{"status": "ok", "timestamp": "..."}`
- [ ] Check logs for any startup errors

## Frontend Deployment (Vercel/Netlify)

### Step 1: Update Environment Variables
- [ ] Go to Vercel/Netlify dashboard
- [ ] Navigate to your project
- [ ] Go to Environment Variables
- [ ] **REMOVE** OAuth variables (if any):
  - [ ] VITE_GOOGLE_CLIENT_ID
  - [ ] VITE_SLACK_CLIENT_ID
  - [ ] VITE_NOTION_CLIENT_ID
- [ ] **VERIFY** these variables still exist:
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
  - [ ] VITE_API_BASE_URL (should be your Render backend URL)
- [ ] Save changes

### Step 2: Deploy Code
- [ ] Push code to GitHub/GitLab
- [ ] Vercel/Netlify auto-deploys
- [ ] Wait for "Ready" status
- [ ] Check deployment logs

### Step 3: Verify Frontend
- [ ] Visit your app URL
- [ ] Can access login page
- [ ] Can access dashboard (if logged in)
- [ ] No console errors

## End-to-End Testing

### Test Google Drive Connection
- [ ] Log into Haven7
- [ ] Go to "Connect Sources"
- [ ] Click "Connect" on Google Drive card
- [ ] **OAuth Credentials Dialog appears**
- [ ] Shows setup instructions
- [ ] Can expand/collapse instructions
- [ ] Client ID field present
- [ ] Client Secret field present (masked)
- [ ] Redirect URI pre-filled correctly
- [ ] Test with real Google OAuth app:
  - [ ] Create OAuth app in Google Cloud Console
  - [ ] Configure redirect URI
  - [ ] Enter credentials in Haven7
  - [ ] Click "Save & Continue"
  - [ ] Redirects to Google consent screen
  - [ ] Grant permissions
  - [ ] Returns to Haven7
  - [ ] Connection shows as "Connected"
  - [ ] Can sync documents

### Test Slack Connection
- [ ] Go to "Connect Sources"
- [ ] Click "Connect" on Slack card
- [ ] OAuth Credentials Dialog appears
- [ ] Test with real Slack OAuth app:
  - [ ] Create Slack app
  - [ ] Configure redirect URI
  - [ ] Add required scopes
  - [ ] Enter credentials in Haven7
  - [ ] OAuth flow completes
  - [ ] Connection active

### Test Notion Connection
- [ ] Go to "Connect Sources"
- [ ] Click "Connect" on Notion card
- [ ] OAuth Credentials Dialog appears
- [ ] Test with real Notion integration:
  - [ ] Create Notion integration (Public)
  - [ ] Configure redirect URI
  - [ ] Enter credentials in Haven7
  - [ ] OAuth flow completes
  - [ ] Connection active

### Test Error Scenarios
- [ ] Try connecting without credentials → Dialog appears
- [ ] Enter invalid credentials → Shows error
- [ ] Enter wrong Client ID → Token exchange fails with clear error
- [ ] Retry with correct credentials → Works

## Database Verification

- [ ] Check `user_connections` table
- [ ] Verify credentials saved:
  - [ ] `client_id` populated (plaintext)
  - [ ] `client_secret_encrypted` populated (encrypted string)
  - [ ] `redirect_uri` populated
  - [ ] `credentials_configured_at` has timestamp
- [ ] Verify encryption:
  - [ ] Client secret is NOT readable plaintext
  - [ ] Looks like encrypted base64 string
- [ ] Test decryption:
  ```sql
  SELECT decrypt_client_secret(
    client_secret_encrypted,
    user_id
  ) FROM user_connections WHERE user_id = 'test-user-id';
  ```
  - [ ] Returns plaintext secret

## Monitoring (First 24 Hours)

### Backend Logs
- [ ] Monitor Render logs for errors
- [ ] Watch for OAuth-related errors
- [ ] Check for credential encryption/decryption errors

### Database
- [ ] Monitor `user_connections` table
- [ ] Check how many users configure credentials
- [ ] Watch for any RLS policy violations

### User Feedback
- [ ] Monitor support channels
- [ ] Common issues with OAuth setup?
- [ ] Documentation gaps?

## Rollback (If Needed)

If anything goes wrong:

### Emergency Rollback
1. [ ] Run `database/backups/rollback-oauth-migration.sql` in Supabase
2. [ ] Revert code to previous commit
3. [ ] Re-add OAuth env variables to Render/Vercel
4. [ ] Redeploy backend and frontend
5. [ ] Verify old OAuth flow works

### Verification After Rollback
- [ ] Database restored from backup
- [ ] New columns removed
- [ ] Old OAuth flow works
- [ ] Existing connections work
- [ ] No data loss

## Post-Deployment

### Documentation
- [ ] Update internal documentation
- [ ] Create user announcement/guide
- [ ] Update onboarding materials

### User Communication
- [ ] Announce the change
- [ ] Link to setup guide: `docs/setup/USER_OAUTH_SETUP_GUIDE.md`
- [ ] Explain benefits (data control, no rate limits)
- [ ] Provide support contact

### Metrics to Track
- [ ] User adoption rate (configured credentials)
- [ ] OAuth success rate
- [ ] Support ticket volume
- [ ] Common errors/issues

## Success Criteria

✅ Deployment is successful if:
- [ ] Database migration completed without errors
- [ ] Backend deployed and healthy
- [ ] Frontend deployed and accessible
- [ ] OAuth credential dialog appears on connect
- [ ] Can save credentials successfully
- [ ] OAuth flow completes end-to-end
- [ ] At least 1 test connection works (Google/Slack/Notion)
- [ ] No critical errors in logs
- [ ] Rollback procedure tested and ready

## Support Resources

- **User Guide**: `docs/setup/USER_OAUTH_SETUP_GUIDE.md`
- **Deployment Guide**: `docs/deployment/DEPLOYMENT_ENV_VARS.md`
- **Implementation Summary**: `docs/USER_OAUTH_MIGRATION_SUMMARY.md`
- **Rollback Script**: `database/backups/rollback-oauth-migration.sql`

---

**Deployment Date:** _____________

**Deployed By:** _____________

**Status:** 
- [ ] ✅ Success
- [ ] ⚠️ Partial (issues noted below)
- [ ] ❌ Failed (rolled back)

**Notes:**
```
(Add any notes, issues, or observations here)
```

