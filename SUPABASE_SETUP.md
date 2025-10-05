# Supabase Database Setup for Real Authentication

## Required Database Tables

### 1. User Connections Table
```sql
CREATE TABLE user_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_user_id TEXT,
  source_name TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  workspace_id TEXT,
  workspace_name TEXT,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint
CREATE UNIQUE INDEX user_connections_user_source_unique 
ON user_connections(user_id, source_type);

-- Enable RLS (Row Level Security)
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own connections" 
ON user_connections FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections" 
ON user_connections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
ON user_connections FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
ON user_connections FOR DELETE 
USING (auth.uid() = user_id);
```

### 2. Search Queries Table (Optional)
```sql
CREATE TABLE search_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  response_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own queries" 
ON search_queries FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queries" 
ON search_queries FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

## Environment Variables to Set in Lovable

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration  
NEXT_PUBLIC_APP_URL=https://your-lovable-domain.lovableproject.com

# OAuth Configuration (Optional - for source connections)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret
```

## Steps to Enable Real Authentication

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Copy URL and keys

2. **Set Up Database Schema**
   - Run the SQL commands above in Supabase SQL Editor
   - This creates the required tables with proper security

3. **Configure Authentication**
   - In Supabase Dashboard → Authentication → Settings
   - Enable email authentication
   - Set up email templates (optional)

4. **Add Environment Variables in Lovable**
   - Go to your Lovable project settings
   - Add the environment variables above
   - Redeploy your project

5. **Test Real Authentication**
   - Users can now create real accounts
   - Login/logout works with real database
   - User data persists between sessions

## What This Enables

✅ **Real User Registration**: Users can create accounts with email/password
✅ **Real Login/Logout**: Authentication works with Supabase
✅ **Data Persistence**: User connections and data are saved
✅ **Security**: Row Level Security protects user data
✅ **Scalability**: Can handle multiple real users

## Current Demo Mode vs Real Mode

**Demo Mode (Current):**
- Any email/password works
- No real database
- Data doesn't persist
- Good for testing UI

**Real Mode (After Setup):**
- Users must register with real email
- Data stored in Supabase
- Persistent user accounts
- Production-ready authentication