# HTTPS Local Development Setup

This guide explains how to set up HTTPS for local development using mkcert, which is required for OAuth integrations (Slack, Google Drive, Notion).

## Why HTTPS for Local Development?

OAuth providers like Slack require HTTPS redirect URIs even for development. Using mkcert creates locally-trusted SSL certificates that:
- Work offline without external tunneling services
- Provide consistent URLs (no more changing ngrok URLs)
- Are faster (no network latency)
- Are trusted by your browser without security warnings

## Prerequisites

- Homebrew (macOS)
- Terminal access
- Admin/sudo password for one-time CA installation

## Installation Steps

### 1. Install mkcert

```bash
brew install mkcert
```

### 2. Install Local CA (One-Time Setup)

This requires your admin password and installs mkcert's certificate authority in your system trust store:

```bash
mkcert -install
```

You'll see:
```
Created a new local CA 💥
The local CA is now installed in the system trust store! ⚡️
```

### 3. Generate SSL Certificates

From your project root:

```bash
cd /path/to/source-searcher-pro
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1
```

This creates two files:
- `localhost.pem` - SSL certificate
- `localhost-key.pem` - Private key

**Note:** These files are gitignored and should NEVER be committed.

### 4. Verify Certificate Files

Check that the certificates were created:

```bash
ls -la localhost*.pem
```

You should see:
```
-rw-------  1 user  staff  1.7K  localhost-key.pem
-rw-r--r--  1 user  staff  1.5K  localhost.pem
```

## Server Configuration

Both the backend server (`server/index.js`) and frontend (Vite) are configured to use HTTPS:

1. **Backend API Server**: Auto-detects SSL certificates and uses HTTPS if available
2. **Frontend (Vite)**: Configured to use the same SSL certificates for HTTPS

Start your servers normally:

```bash
npm run dev
```

You should see:
```
[0] ➜  Local:   https://localhost:8080/
[1] ✓ API server running on https://localhost:3000
```

Both servers will use HTTPS with the mkcert certificates.

If certificates are missing, the backend will show:
```
⚠️  SSL certificates not found. API server running on http://localhost:3000
   Run 'mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1' to enable HTTPS
```

## OAuth Configuration

After setting up HTTPS, update your OAuth redirect URIs in each provider's console:

### Slack App Configuration

1. Go to: https://api.slack.com/apps
2. Select your app
3. Navigate to **OAuth & Permissions**
4. Under **Redirect URLs**, add:
   ```
   https://localhost:3000/api/auth/slack/callback
   ```
5. Click **Save URLs**

### Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://localhost:3000/api/auth/google/callback
   ```
4. Click **Save**

### Notion Integration

1. Go to: https://www.notion.so/my-integrations
2. Select your integration
3. Under **Redirect URIs**, add:
   ```
   https://localhost:3000/api/auth/notion/callback
   ```
4. Click **Save**

## Testing

### 1. Verify HTTPS Server

Open your browser and navigate to:
```
https://localhost:3000/api/health
```

You should see:
- No security warnings
- Valid SSL certificate
- JSON response: `{"status":"ok","timestamp":"..."}`

### 2. Test Frontend Connection

Open:
```
https://localhost:8080
```

The frontend should load without mixed content warnings.

### 3. Test OAuth Flows

Try connecting each integration:
1. Google Drive - should redirect to Google OAuth
2. Slack - should redirect to Slack OAuth
3. Notion - should redirect to Notion OAuth

All three should complete without errors.

## Troubleshooting

### Browser Shows "Not Secure" Warning

**Problem:** The local CA is not installed in your system trust store.

**Solution:**
```bash
mkcert -install
```

Enter your admin password when prompted.

### "Certificate Not Found" Error

**Problem:** SSL certificates are missing or in wrong location.

**Solution:**
```bash
cd /path/to/source-searcher-pro
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1
```

### "ERR_SSL_PROTOCOL_ERROR"

**Problem:** Server is trying to use HTTPS but certificates are invalid.

**Solution:** Regenerate certificates:
```bash
rm localhost.pem localhost-key.pem
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1
```

### OAuth Redirect Fails with "redirect_uri_mismatch"

**Problem:** OAuth provider settings don't match your redirect URI.

**Solution:**
1. Verify you're using `https://localhost:3000/api/auth/[provider]/callback`
2. Update the OAuth app settings (see [OAuth Configuration](#oauth-configuration))
3. Wait 2-3 minutes for changes to propagate
4. Clear browser cache and try again

### Port Already in Use

**Problem:** Another process is using port 3000 or 8080.

**Solution:**
```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill -9

# Kill processes on port 8080
lsof -ti:8080 | xargs kill -9
```

## Certificate Expiration

mkcert certificates are valid for 2+ years. To check expiration:

```bash
openssl x509 -in localhost.pem -noout -dates
```

To renew (when expired):
```bash
rm localhost.pem localhost-key.pem
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1
```

No need to update OAuth redirect URIs - they remain the same.

## Security Notes

- **Never commit** `localhost.pem` or `localhost-key.pem` to git (already in `.gitignore`)
- Certificates are only trusted on your machine
- mkcert CA is specific to your user account
- These certificates work only for `localhost` and `127.0.0.1`

## Alternative: Production Deployment

For production or sharing with others, deploy to a hosting service:
- Vercel (recommended)
- Netlify
- Railway
- Render

These platforms provide real HTTPS certificates automatically.

## Uninstalling

To remove mkcert and its CA:

```bash
# Uninstall the local CA
mkcert -uninstall

# Remove certificates
rm localhost.pem localhost-key.pem

# Uninstall mkcert
brew uninstall mkcert
```

## Resources

- [mkcert GitHub](https://github.com/FiloSottile/mkcert)
- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Notion OAuth Documentation](https://developers.notion.com/docs/authorization)

