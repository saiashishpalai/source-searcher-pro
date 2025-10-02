# Production OAuth Setup Guide

## Environment Separation

### Development (.env.local)
```bash
# Your personal development credentials
GOOGLE_CLIENT_ID=your-dev-google-client-id
SLACK_CLIENT_ID=your-dev-slack-client-id
NOTION_CLIENT_ID=your-dev-notion-client-id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Staging (.env.staging)
```bash
# Company staging environment credentials
GOOGLE_CLIENT_ID=haven7-staging-google-client-id
SLACK_CLIENT_ID=haven7-staging-slack-client-id  
NOTION_CLIENT_ID=haven7-staging-notion-client-id
NEXT_PUBLIC_APP_URL=https://staging.haven7.com
```

### Production (.env.production)
```bash
# Company production credentials
GOOGLE_CLIENT_ID=haven7-prod-google-client-id
SLACK_CLIENT_ID=haven7-prod-slack-client-id
NOTION_CLIENT_ID=haven7-prod-notion-client-id
NEXT_PUBLIC_APP_URL=https://haven7.com
```

## Secure Credential Management

### Option 1: Vercel Environment Variables
```bash
# Set via Vercel Dashboard or CLI
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add SLACK_CLIENT_SECRET production
vercel env add NOTION_CLIENT_SECRET production
```

### Option 2: AWS Systems Manager / Azure Key Vault
```typescript
// Example: Loading from AWS Parameter Store
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const getSecret = async (parameterName: string) => {
  const client = new SSMClient({ region: "us-east-1" });
  const command = new GetParameterCommand({
    Name: parameterName,
    WithDecryption: true
  });
  const response = await client.send(command);
  return response.Parameter?.Value;
};

// Usage in your API routes
const googleClientSecret = await getSecret("/haven7/prod/google-client-secret");
```

## OAuth App Configuration Changes

### 1. Google Cloud Console (Production)
- **Project**: Create "Haven7 Production"
- **OAuth 2.0 Client**:
  - Name: "Haven7 - Production"
  - Authorized origins: `https://haven7.com`
  - Authorized redirect URIs: `https://haven7.com/api/auth/drive/callback`
- **OAuth Consent Screen**:
  - User Type: External
  - App name: "Haven7"
  - App domain: `haven7.com`
  - Privacy policy: `https://haven7.com/privacy`
  - Terms of service: `https://haven7.com/terms`

### 2. Slack App Directory (Production)
- **App Name**: "Haven7"
- **Redirect URLs**: `https://haven7.com/api/auth/slack/callback`
- **OAuth Scopes**: Same as development
- **App Directory Submission**:
  - App icon and branding
  - Description and screenshots
  - Privacy policy and terms
  - Security review process

### 3. Notion Integrations (Production)
- **Integration Name**: "Haven7"
- **Redirect URI**: `https://haven7.com/api/auth/notion/callback`
- **Integration Type**: Public (available to all Notion users)
- **Capabilities**: Read content

## Multi-Tenant Architecture

For a SaaS product, you might need to support multiple OAuth apps:

```typescript
// Dynamic OAuth configuration based on tenant
const getOAuthConfig = (tenant: string) => {
  return {
    google: {
      clientId: process.env[`GOOGLE_CLIENT_ID_${tenant.toUpperCase()}`],
      clientSecret: process.env[`GOOGLE_CLIENT_SECRET_${tenant.toUpperCase()}`]
    },
    slack: {
      clientId: process.env[`SLACK_CLIENT_ID_${tenant.toUpperCase()}`],
      clientSecret: process.env[`SLACK_CLIENT_SECRET_${tenant.toUpperCase()}`]
    }
  };
};
```

## Security Considerations

### 1. Domain Verification
- Verify ownership of haven7.com domain
- Set up proper SSL certificates
- Configure CORS policies

### 2. Rate Limiting
```typescript
// Implement rate limiting for OAuth endpoints
import rateLimit from 'express-rate-limit';

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many OAuth attempts, please try again later'
});
```

### 3. Audit Logging
```typescript
// Log all OAuth events for security monitoring
const logOAuthEvent = (event: string, userId: string, provider: string) => {
  console.log({
    timestamp: new Date().toISOString(),
    event,
    userId,
    provider,
    ip: request.ip,
    userAgent: request.headers['user-agent']
  });
};
```

## Deployment Pipeline

### 1. CI/CD Environment Variables
```yaml
# GitHub Actions example
- name: Deploy to Production
  env:
    GOOGLE_CLIENT_ID: ${{ secrets.PROD_GOOGLE_CLIENT_ID }}
    GOOGLE_CLIENT_SECRET: ${{ secrets.PROD_GOOGLE_CLIENT_SECRET }}
    SLACK_CLIENT_ID: ${{ secrets.PROD_SLACK_CLIENT_ID }}
    SLACK_CLIENT_SECRET: ${{ secrets.PROD_SLACK_CLIENT_SECRET }}
```

### 2. Environment Validation
```typescript
// Validate all required environment variables on startup
const validateEnvironment = () => {
  const required = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SLACK_CLIENT_ID', 
    'SLACK_CLIENT_SECRET',
    'NOTION_CLIENT_ID',
    'NOTION_CLIENT_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
```

## Migration Strategy

### Phase 1: Development → Staging
1. Create staging OAuth apps
2. Deploy to staging environment
3. Test with staging credentials
4. Validate all flows work

### Phase 2: Staging → Production
1. Create production OAuth apps
2. Submit for app directory reviews (Slack, Google)
3. Set up production environment variables
4. Deploy with production credentials
5. Monitor and validate

## Compliance & Legal

### Required Documentation
- Privacy Policy (how you handle OAuth data)
- Terms of Service
- Data Processing Agreement (for enterprise)
- Security questionnaires for enterprise customers

### OAuth Compliance
- Follow each platform's branding guidelines
- Implement proper scope requests
- Handle token refresh properly
- Respect rate limits and usage policies
