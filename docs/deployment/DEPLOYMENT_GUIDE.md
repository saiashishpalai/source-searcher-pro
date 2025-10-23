# Production Deployment Guide

This guide covers deploying Haven7 to production using Vercel (frontend) and Render (backend).

## 🚀 Overview

Haven7 uses a modern deployment architecture:

- **Frontend**: React app deployed on Vercel
- **Backend**: Node.js API deployed on Render
- **Database**: Supabase (managed PostgreSQL)
- **CDN**: Vercel's global CDN for frontend assets

## 📋 Prerequisites

Before deploying, ensure you have:

- [ ] GitHub repository with your code
- [ ] Supabase project created
- [ ] OAuth credentials for Google, Slack, and Notion
- [ ] OpenAI API key
- [ ] Vercel account
- [ ] Render account

## 🎯 Deployment Steps

### 1. Backend Deployment (Render)

1. **Connect to Render**
   - Go to [https://render.com](https://render.com)
   - Sign in with GitHub
   - Click "New" → "Web Service

2. **Configure Service**
   - **Name**: `source-searcher-pro`
   - **Repository**: Your GitHub repository
   - **Branch**: `main`
   - **Root Directory**: `/` (leave empty)
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=10000
   
   # Supabase
   VITE_SUPABASE_URL=your-supabase-url
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
   API_BASE_URL=https://source-searcher-pro.onrender.com
   APP_URL=https://source-searcher-pro.vercel.app
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note the service URL (e.g., `https://source-searcher-pro.onrender.com`)

### 2. Frontend Deployment (Vercel)

1. **Connect to Vercel**
   - Go to [https://vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"

2. **Import Repository**
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `/` (leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Set Environment Variables**
   ```
   # Supabase
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # API
   VITE_API_URL=https://source-searcher-pro.onrender.com
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Note the deployment URL (e.g., `https://source-searcher-pro.vercel.app`)

### 3. Database Setup (Supabase)

1. **Create Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Create new project
   - Note the project URL and API keys

2. **Run Database Migrations**
   - Go to SQL Editor in Supabase dashboard
   - Run the scripts in `database/fixes/fix-user-connections-table.sql`
   - Run the scripts in `database/fixes/add-token-expires-column.sql`

3. **Configure RLS Policies**
   - Ensure Row Level Security is enabled
   - Verify policies are correctly set up
   - Test with service role key

### 4. OAuth Configuration

Update your OAuth app settings with the production URLs:

#### Google Cloud Console
- Redirect URI: `https://source-searcher-pro.onrender.com/api/auth/google/callback`

#### Slack App Settings
- Redirect URL: `https://source-searcher-pro.onrender.com/api/auth/slack/callback`

#### Notion Integration
- Redirect URI: `https://source-searcher-pro.onrender.com/api/auth/notion/callback`

## 🔧 Post-Deployment Configuration

### 1. Update Environment Variables

After deployment, update your OAuth app settings with the production URLs:

```bash
# Update these in your OAuth app settings
GOOGLE_REDIRECT_URI=https://source-searcher-pro.onrender.com/api/auth/google/callback
SLACK_REDIRECT_URI=https://source-searcher-pro.onrender.com/api/auth/slack/callback
NOTION_REDIRECT_URI=https://source-searcher-pro.onrender.com/api/auth/notion/callback
```

### 2. Test OAuth Connections

1. **Visit your frontend URL**
2. **Sign up/Login** with your account
3. **Test connecting each service**:
   - Google Drive
   - Slack
   - Notion
4. **Verify connections** are saved in database

### 3. Monitor Deployment

#### Render Monitoring
- **Logs**: Check Render logs for any errors
- **Health**: Use `/api/health` endpoint
- **Debug**: Use `/api/debug/env` to check environment variables

#### Vercel Monitoring
- **Analytics**: Check Vercel analytics for performance
- **Functions**: Monitor serverless function performance
- **CDN**: Check global CDN performance

## 🛠️ Troubleshooting

### Common Deployment Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Environment Variable Issues**
   - Verify all required variables are set
   - Check variable names match exactly
   - Test with debug endpoints

3. **OAuth Connection Issues**
   - Verify redirect URIs match exactly
   - Check OAuth app settings
   - Test with debug endpoints

4. **Database Connection Issues**
   - Verify Supabase credentials
   - Check RLS policies
   - Test database connectivity

### Debug Endpoints

Use these endpoints to troubleshoot:

```bash
# Check backend health
curl https://source-searcher-pro.onrender.com/api/health

# Check environment variables
curl https://source-searcher-pro.onrender.com/api/debug/env

# Test database connection
curl https://source-searcher-pro.onrender.com/api/debug/db-test
```

## 📊 Performance Optimization

### Frontend Optimization

- **Code Splitting**: Automatic with Vite
- **Tree Shaking**: Automatic with Vite
- **CDN**: Vercel's global CDN
- **Caching**: Automatic with Vercel

### Backend Optimization

- **Connection Pooling**: Supabase handles this
- **Caching**: Implement Redis if needed
- **Compression**: Enable gzip compression
- **Rate Limiting**: Implement if needed

### Database Optimization

- **Indexes**: Proper indexing on frequently queried columns
- **RLS**: Efficient Row Level Security policies
- **Connection Limits**: Monitor connection usage
- **Query Optimization**: Monitor slow queries

## 🔒 Security Considerations

### Production Security

1. **Environment Variables**
   - Never commit secrets to repository
   - Use secure environment variable storage
   - Rotate keys regularly

2. **Database Security**
   - Enable RLS on all tables
   - Use service role only for backend operations
   - Monitor database access

3. **OAuth Security**
   - Use HTTPS for all redirect URIs
   - Implement proper state parameter validation
   - Monitor OAuth usage

4. **API Security**
   - Implement rate limiting
   - Use proper CORS settings
   - Validate all inputs

## 📈 Monitoring and Maintenance

### Health Checks

Set up monitoring for:

- **Backend Health**: `/api/health` endpoint
- **Database Connectivity**: Regular connection tests
- **OAuth Functionality**: Periodic connection tests
- **Frontend Performance**: Vercel analytics

### Maintenance Tasks

- **Regular Updates**: Keep dependencies updated
- **Security Patches**: Apply security updates promptly
- **Database Maintenance**: Monitor and optimize queries
- **Backup Verification**: Ensure backups are working

## 🚀 Scaling Considerations

### Horizontal Scaling

- **Frontend**: Vercel handles automatic scaling
- **Backend**: Render can scale based on demand
- **Database**: Supabase handles scaling automatically

### Vertical Scaling

- **Render**: Upgrade to higher tier if needed
- **Supabase**: Upgrade to Pro plan for better performance
- **Vercel**: Upgrade to Pro plan for better features

## 📞 Support

If you encounter issues:

1. **Check Logs**: Review Render and Vercel logs
2. **Debug Endpoints**: Use provided debug endpoints
3. **Documentation**: Refer to this guide and other docs
4. **GitHub Issues**: Create detailed issue reports
