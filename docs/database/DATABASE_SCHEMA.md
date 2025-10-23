# Database Schema

This document describes the complete database schema for Haven7, including tables, relationships, and security policies.

## 🗄️ Database Overview

Haven7 uses Supabase (PostgreSQL) as its primary database with the following key components:

- **Authentication**: Supabase Auth for user management
- **Data Storage**: PostgreSQL for application data
- **Security**: Row Level Security (RLS) for data protection
- **Real-time**: Supabase real-time subscriptions

## 📊 Core Tables

### 1. `profiles` Table

Extends Supabase's `auth.users` table with additional user information.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Store user profile information
**Relationships**: One-to-one with `auth.users`

### 2. `user_connections` Table

Stores OAuth connections for each user and service.

```sql
CREATE TABLE user_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('google_drive', 'slack', 'notion', 'teams')),
  source_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  workspace_id TEXT,
  workspace_name TEXT
);
```

**Purpose**: Store OAuth tokens and connection metadata
**Relationships**: Many-to-one with `auth.users`
**Unique Constraint**: `(user_id, source_type)`

### 3. `search_queries` Table

Tracks user search queries for analytics and improvement.

```sql
CREATE TABLE search_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  response_time INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Store search history and analytics
**Relationships**: Many-to-one with `auth.users`

## 🔐 Security Policies

### Row Level Security (RLS)

All tables have RLS enabled to ensure users can only access their own data.

#### Profiles Policies

```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

#### User Connections Policies

```sql
-- Users can view their own connections
CREATE POLICY "Users can view own connections" ON user_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own connections
CREATE POLICY "Users can insert own connections" ON user_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update own connections" ON user_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own connections" ON user_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all connections (for backend operations)
CREATE POLICY "Service role can manage all connections" ON user_connections
  FOR ALL USING (auth.role() = 'service_role');
```

#### Search Queries Policies

```sql
-- Users can view their own search queries
CREATE POLICY "Users can view own queries" ON search_queries
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own search queries
CREATE POLICY "Users can insert own queries" ON search_queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## 🔧 Indexes

### Performance Indexes

```sql
-- User connections indexes
CREATE INDEX idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX idx_user_connections_source_type ON user_connections(source_type);
CREATE INDEX idx_user_connections_is_active ON user_connections(is_active);
CREATE UNIQUE INDEX idx_user_connections_unique ON user_connections(user_id, source_type);

-- Search queries indexes
CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at);
```

## 🔄 Triggers

### Updated At Triggers

All tables have triggers to automatically update the `updated_at` timestamp:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_connections_updated_at
    BEFORE UPDATE ON user_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## 📈 Data Flow

### OAuth Connection Flow

1. **User initiates OAuth** → Frontend redirects to backend
2. **Backend handles OAuth** → Exchanges code for tokens
3. **Backend saves connection** → Inserts into `user_connections`
4. **RLS policies enforce** → User can only access their own data

### Search Flow

1. **User performs search** → Frontend sends query to backend
2. **Backend processes search** → Uses OpenAI for semantic search
3. **Backend logs query** → Inserts into `search_queries`
4. **Results returned** → Filtered by user's accessible content

## 🛠️ Database Management

### Migrations

All database changes are managed through migration files in the `database/migrations/` directory:

- `database-migration.sql` - Initial schema
- `user-oauth-credentials-migration.sql` - OAuth credentials support
- `incremental-sync-schema.sql` - Sync tracking

### Backup and Recovery

- **Automatic backups**: Supabase handles daily backups
- **Manual backups**: Use `database/backups/` scripts
- **Recovery**: Restore from Supabase dashboard or backup files

### Monitoring

- **Query performance**: Monitor slow queries in Supabase dashboard
- **Connection limits**: Track active connections
- **Storage usage**: Monitor database size and growth

## 🔍 Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Check that policies are correctly defined
   - Verify user authentication status
   - Test with service role for backend operations

2. **Connection Issues**
   - Verify Supabase connection string
   - Check environment variables
   - Test database connectivity

3. **Migration Errors**
   - Run migrations in correct order
   - Check for conflicting changes
   - Verify backup before major changes

### Debug Queries

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_connections';

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_connections';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'user_connections';
```
