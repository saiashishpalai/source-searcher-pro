# 🚀 Supabase Integration Setup Guide

This guide will help you set up Supabase authentication and database for Haven7.

## 📋 Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A new Supabase project created

## 🔧 Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `haven7`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

### 2. Get Your Supabase Credentials

1. Go to your project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

### 3. Set Up Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Secret (optional, for additional security)
JWT_SECRET=your_jwt_secret_key_here
```

### 4. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run" to execute the schema

### 5. Configure Authentication Settings

1. Go to **Authentication** → **Settings**
2. Configure the following:

#### Site URL
```
http://localhost:3000
```

#### Redirect URLs
```
http://localhost:3000/verify-email
http://localhost:3000/reset-password
http://localhost:3000/dashboard
```

#### Email Templates (Optional)
Customize the email templates in **Authentication** → **Email Templates**:

- **Confirm signup**: Customize the email verification template
- **Reset password**: Customize the password reset template

### 6. Install Dependencies

Run the following command to install Supabase packages:

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 7. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
3. Try signing up with a real email address
4. Check your email for the verification link
5. Complete the signup process

## 🔐 Features Included

### ✅ Authentication Features
- **Signup with Email Verification**: Users receive verification emails
- **Login**: Secure authentication with JWT tokens
- **Password Reset**: Email-based password reset flow
- **Session Management**: Automatic session handling
- **Logout**: Secure session termination

### ✅ Database Features
- **User Profiles**: Extended user information
- **Connected Sources**: Track user's connected apps (Slack, Notion, Google Drive)
- **Search History**: Store and track search queries
- **Row Level Security**: Secure data access

### ✅ Security Features
- **Rate Limiting**: Built-in protection against abuse
- **JWT Tokens**: Secure authentication tokens
- **Email Verification**: Prevent fake accounts
- **Password Hashing**: Secure password storage

## 🗄️ Database Schema

### Tables Created

1. **profiles** - Extended user information
2. **user_sources** - Connected external sources
3. **search_queries** - Search history and analytics

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Secure data isolation between users
- Proper authentication requirements

## 🚀 Next Steps

### 1. Customize Email Templates
- Go to **Authentication** → **Email Templates**
- Customize the design and content
- Add your branding

### 2. Set Up External Integrations
- Configure Slack OAuth
- Set up Notion API
- Connect Google Drive API

### 3. Deploy to Production
- Update environment variables for production
- Configure production redirect URLs
- Set up proper domain names

## 🔧 Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check your environment variables
   - Ensure you're using the correct keys

2. **Email verification not working**
   - Check your redirect URLs
   - Verify email template configuration

3. **Database connection issues**
   - Verify your database password
   - Check if the schema was applied correctly

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

## 📊 Monitoring

### Supabase Dashboard
- Monitor user registrations
- Track authentication events
- View database performance
- Check API usage

### Analytics
- User signup rates
- Authentication success rates
- Search query patterns
- Source connection rates

## 🔒 Security Best Practices

1. **Never commit secrets** to version control
2. **Use environment variables** for all sensitive data
3. **Enable RLS** on all tables
4. **Regular security audits** of your policies
5. **Monitor authentication logs** for suspicious activity

---

🎉 **Congratulations!** Your Haven7 application now has full Supabase integration with secure authentication, database management, and all the features you requested!
