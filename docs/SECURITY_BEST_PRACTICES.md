# 🔒 Security Best Practices

This guide outlines security best practices for managing API keys, secrets, and sensitive data in this project.

---

## 🚨 Critical Rules

### ❌ NEVER Commit These to Git

1. **API Keys & Secrets:**
   - Slack Client Secret
   - Notion API Keys
   - Google Client Secrets
   - OpenAI API Keys
   - Supabase Service Role Keys

2. **Environment Files:**
   - `.env.local`
   - `.env.production`
   - Any file containing actual credentials

3. **Token Files:**
   - OAuth access tokens
   - Refresh tokens
   - Session tokens

---

## ✅ Safe to Commit (Public Information)

These are designed to be public-facing:

1. **Supabase URL** - Public endpoint
2. **Supabase Anon Key** - Client-side key (protected by RLS)
3. **Client IDs** (without secrets) - Public identifiers
4. **Project IDs** - Non-sensitive identifiers

**Note:** Even though these are safe, always verify with official documentation.

---

## 📋 Proper Secret Management

### 1. Use Environment Variables

**Development:**
```bash
# .env.local (NEVER commit this file)
SLACK_CLIENT_SECRET=your_actual_secret
NOTION_API_KEY=your_actual_key
OPENAI_API_KEY=sk-your_actual_key
GOOGLE_CLIENT_SECRET=your_actual_secret
```

**Production:**
- Use your hosting platform's environment variable manager
- Examples: Vercel Environment Variables, Netlify Environment Variables, Railway Secrets

### 2. Use Template Files

**Good Example - env.example:**
```bash
# Safe to commit - contains NO real values
SLACK_CLIENT_ID=your-slack-client-id-here
SLACK_CLIENT_SECRET=your-slack-client-secret-here
```

### 3. Documentation Best Practices

When documenting configuration in README files:

**❌ BAD:**
```
# Don't show real credentials
SLACK_CLIENT_ID=9686909204692.9680577385413
SLACK_CLIENT_SECRET=843eda4877df61a3461a441cb13c58f8
```

**✅ GOOD:**
```
# Use obvious placeholders
SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here
```

Or use formatted placeholders:
```
SLACK_CLIENT_ID=<your-slack-client-id>
SLACK_CLIENT_SECRET=<your-slack-client-secret>
```

---

## 🔍 How to Check for Leaked Secrets

### Manual Check

```bash
# Search for common secret patterns
grep -r "sk-[a-zA-Z0-9]" . --exclude-dir=node_modules
grep -r "xoxb-" . --exclude-dir=node_modules
grep -r "secret_" . --exclude-dir=node_modules
```

### Use Git-Secrets Tool

```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
sudo apt-get install git-secrets  # Linux

# Setup in your repo
cd /path/to/your/repo
git secrets --install
git secrets --register-aws

# Add custom patterns
git secrets --add 'SLACK_CLIENT_SECRET=[^y][a-zA-Z0-9]+'
git secrets --add 'sk-[a-zA-Z0-9]{20,}'
git secrets --add 'xoxb-[a-zA-Z0-9-]+'
```

---

## 🚑 What to Do If You Leaked Secrets

### Immediate Actions (Do this NOW!)

1. **Revoke/Regenerate ALL exposed credentials:**
   - **Slack:** https://api.slack.com/apps → Your App → Credentials → Regenerate
   - **Notion:** https://www.notion.so/my-integrations → Regenerate
   - **OpenAI:** https://platform.openai.com/api-keys → Revoke & Create New
   - **Google:** https://console.cloud.google.com/apis/credentials → Regenerate

2. **Update your local `.env.local` with new credentials**

3. **Update production environment variables** (if applicable)

### Clean Git History

**Option 1: Remove from recent commit (if just committed)**
```bash
# Edit the file to remove secrets
git add path/to/file
git commit --amend --no-edit
git push --force-with-lease
```

**Option 2: Use BFG Repo-Cleaner (for older commits)**
```bash
# Install BFG
brew install bfg  # macOS

# Create a passwords.txt file with secrets to remove
echo "843eda4877df61a3461a441cb13c58f8" > passwords.txt

# Run BFG
bfg --replace-text passwords.txt

# Force push (CAREFUL!)
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

**⚠️ Warning:** Force pushing rewrites history. Coordinate with team members!

---

## 🛡️ Prevention Strategies

### 1. Pre-commit Hooks

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash

# Check for common secret patterns
if git diff --cached | grep -E 'sk-[a-zA-Z0-9]{20,}|xoxb-|secret_[a-zA-Z0-9]{20,}'; then
    echo "❌ ERROR: Potential secret detected!"
    echo "Please remove secrets before committing."
    exit 1
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### 2. Use Secret Scanning Tools

**GitHub Secret Scanning** (if using GitHub):
- Automatically enabled for public repos
- Enable for private repos: Settings → Security → Secret scanning

**GitGuardian:**
```bash
# Install
pip install ggshield

# Scan repository
ggshield scan repo .
```

### 3. Environment Variable Checklist

Before committing, verify:
- [ ] All `.env*` files are in `.gitignore`
- [ ] No hardcoded secrets in source code
- [ ] Documentation uses placeholder values only
- [ ] `env.example` contains no real values

---

## 📝 Rotation Schedule

Rotate secrets regularly:

- **Critical Production Secrets:** Every 90 days
- **Development Secrets:** Every 180 days
- **After Team Member Departure:** Immediately
- **After Any Suspected Exposure:** Immediately

---

## 🔐 Additional Security Tips

### 1. Principle of Least Privilege
- Use separate keys for development vs production
- Limit API key permissions to only what's needed

### 2. API Key Restrictions
- **Google APIs:** Restrict by IP address or HTTP referrer
- **OpenAI:** Set usage limits and spending caps

### 3. Monitor Usage
- Regularly check API usage dashboards
- Set up alerts for unusual activity

### 4. Team Education
- Share this document with all team members
- Review security practices in code reviews
- Make security everyone's responsibility

---

## 📚 Resources

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitGuardian Best Practices](https://www.gitguardian.com/secrets-management-best-practices)
- [Slack Security Best Practices](https://api.slack.com/authentication/best-practices)

---

## ⚡ Quick Reference

### Safe to Commit ✅
- `env.example` (with placeholder values)
- Documentation with `<placeholder>` or `your-key-here` values
- Public client IDs (without secrets)
- Supabase URL and Anon Key

### Never Commit ❌
- `.env.local`, `.env.production`
- Any file with `secret`, `password`, `token` in real values
- OAuth client secrets
- API keys (OpenAI, Slack bot tokens, etc.)
- Private keys or certificates

---

**Remember:** When in doubt, DON'T commit it. You can always add it later, but removing it from Git history is difficult!


