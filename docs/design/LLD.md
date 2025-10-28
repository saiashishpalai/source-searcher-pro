# Low-Level Design (LLD) - Source Searcher Pro

## Detailed Component Architecture

### 1. Frontend Components

#### 1.1 Core React Components
```
src/
├── components/
│   ├── SearchInterface.tsx          # Main search UI
│   ├── ProtectedRoute.tsx           # Authentication guard
│   ├── ConnectionManager.tsx       # OAuth connection management
│   ├── SearchResults.tsx           # Results display
│   └── DocumentPreview.tsx         # Document viewer
├── contexts/
│   └── AuthContext.tsx             # Authentication state
├── pages/
│   ├── Landing.tsx                  # Public landing page
│   ├── Index.tsx                    # Dashboard
│   ├── Login.tsx                    # Authentication
│   └── ConnectedSources.tsx        # Source management
└── hooks/
    ├── useOAuthIntegration.ts      # OAuth flow management
    └── use-mobile.tsx              # Responsive utilities
```

#### 1.2 State Management
```typescript
// AuthContext provides:
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
}
```

### 2. Backend Services Architecture

#### 2.1 Express Server Structure
```javascript
server/
├── index.js                    # Main server entry point
├── services/
│   ├── search-service.js       # AI search implementation
│   ├── document-sync.js        # Document synchronization
│   ├── google-drive-sync.js    # Google Drive integration
│   ├── notion-sync.js          # Notion integration
│   └── slack-sync.js           # Slack integration
└── utils/
    └── document-similarity.js  # TF-IDF similarity calculations
```

#### 2.2 API Endpoints
```javascript
// Authentication & OAuth
GET  /api/auth/google           # Google OAuth initiation
GET  /api/auth/google/callback  # Google OAuth callback
GET  /api/auth/slack           # Slack OAuth initiation
GET  /api/auth/slack/callback  # Slack OAuth callback
GET  /api/auth/notion          # Notion OAuth initiation
GET  /api/auth/notion/callback # Notion OAuth callback

// Connection Management
GET  /api/connections/get      # Get user connections
POST /api/connections/disconnect # Disconnect source

// Document Synchronization
POST /api/sync/google-drive    # Sync Google Drive
POST /api/sync/notion          # Sync Notion
POST /api/sync/slack           # Sync Slack
GET  /api/sync/status          # Get sync status

// Search Operations
POST /api/search               # Main search endpoint
POST /api/search/followup     # Follow-up search
POST /api/regenerate-summary  # Regenerate AI summary

// Document Management
POST /api/documents/link-versions     # Link document versions
POST /api/documents/dismiss-duplicate # Dismiss duplicate
```

### 3. Database Schema Design

#### 3.1 Core Tables
```sql
-- User profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User connections to external services
CREATE TABLE user_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('google_drive', 'slack', 'notion')),
  source_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  client_id TEXT,
  client_secret_encrypted TEXT,
  redirect_uri TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_type)
);

-- Document storage
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  author TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  version_group_id UUID,
  version_number INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  UNIQUE(user_id, source_id, source_type)
);

-- Document chunks for vector search
CREATE TABLE document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search history
CREATE TABLE search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  search_time_ms INTEGER,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2 Database Functions
```sql
-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 20,
  user_id_param UUID
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INTEGER,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.user_id = user_id_param
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Encryption functions for OAuth secrets
CREATE OR REPLACE FUNCTION encrypt_client_secret(
  secret TEXT,
  user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Implementation for encrypting client secrets
  RETURN encode(encrypt(secret::bytea, current_setting('app.settings.encryption_key')::bytea, 'aes'), 'base64');
END;
$$;
```

### 4. Service Layer Implementation

#### 4.1 Search Service Architecture
```javascript
class SearchService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
    this.embeddingModel = 'text-embedding-3-small';
    this.llmModel = 'gpt-4o-mini';
  }

  // Query classification for tailored responses
  classifyQuery(query) {
    // 15 different query types with specific boost terms
    // Strategic, Status, Client Context, Comparison, etc.
  }

  // Vector similarity search with RAG
  async search(userId, query, supabaseAdmin) {
    // 1. Generate query embedding
    // 2. Vector similarity search
    // 3. Re-rank with boost terms
    // 4. Apply recency boost
    // 5. Deduplicate versions
    // 6. Generate AI summary
  }

  // Follow-up search within specific documents
  async searchWithinDocuments(userId, query, documentIds, supabaseAdmin) {
    // Targeted search within selected documents
  }
}
```

#### 4.2 Document Synchronization
```javascript
// Google Drive Sync
class GoogleDriveSync {
  async syncGoogleDrive(userId, accessToken) {
    // 1. Fetch file list from Google Drive API
    // 2. Process each file (text extraction)
    // 3. Generate embeddings for content
    // 4. Store in database with metadata
    // 5. Handle version conflicts
  }
}

// Slack Sync
class SlackSync {
  async syncSlack(userId, accessToken) {
    // 1. Fetch channels and messages
    // 2. Process file attachments
    // 3. Extract conversation context
    // 4. Generate embeddings
    // 5. Store with thread information
  }
}

// Notion Sync
class NotionSync {
  async syncNotion(userId, accessToken) {
    // 1. Fetch pages and databases
    // 2. Process Notion blocks
    // 3. Extract structured content
    // 4. Generate embeddings
    // 5. Store with page hierarchy
  }
}
```

### 5. Authentication Flow

#### 5.1 OAuth Implementation
```javascript
// OAuth initiation
app.get('/api/auth/google', async (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  const stateWithUserId = `${state}:${userId}`;
  
  const authorizationUrl = `https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${redirectUri}&` +
    `scope=${scope}&` +
    `state=${stateWithUserId}`;
    
  res.redirect(authorizationUrl);
});

// OAuth callback handling
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const [stateHex, userId] = state.split(':');
  
  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code, client_id, client_secret, redirect_uri, grant_type: 'authorization_code'
    })
  });
  
  const tokens = await tokenResponse.json();
  
  // Store connection in database
  await supabaseAdmin.from('user_connections').upsert({
    user_id: userId,
    source_type: 'google_drive',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    is_active: true
  });
});
```

### 6. Data Processing Pipeline

#### 6.1 Document Processing
```javascript
// Document chunking strategy
const processDocument = async (content, metadata) => {
  // 1. Text extraction based on file type
  // 2. Chunking with overlap for context
  // 3. Generate embeddings for each chunk
  // 4. Store chunks with metadata
  // 5. Detect potential duplicates
};

// Chunking configuration
const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200; // characters for context
```

#### 6.2 Vector Search Implementation
```javascript
// Embedding generation
async generateEmbedding(text) {
  const response = await this.openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;
}

// Similarity calculation
calculateCosineSimilarity(vectorA, vectorB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### 7. Error Handling & Resilience

#### 7.1 API Error Handling
```javascript
// Rate limiting
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 100;

// Error recovery
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

#### 7.2 Database Error Handling
```javascript
// Connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Transaction handling
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

### 8. Performance Optimizations

#### 8.1 Caching Strategy
```javascript
// Redis caching for frequent queries
const cache = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// Cache search results
const getCachedResults = async (query, userId) => {
  const key = `search:${userId}:${hashQuery(query)}`;
  return await cache.get(key);
};

// Cache embeddings
const getCachedEmbedding = async (text) => {
  const key = `embedding:${hashText(text)}`;
  return await cache.get(key);
};
```

#### 8.2 Database Indexing
```sql
-- Performance indexes
CREATE INDEX idx_document_chunks_user_id ON document_chunks(user_id);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_documents_user_source ON documents(user_id, source_type);
CREATE INDEX idx_search_history_user_created ON search_history(user_id, created_at);
```

### 9. Security Implementation

#### 9.1 Row Level Security
```sql
-- RLS policies
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chunks" ON document_chunks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own connections" ON user_connections
  FOR ALL USING (auth.uid() = user_id);
```

#### 9.2 Input Validation
```javascript
// Request validation
const validateSearchRequest = (req, res, next) => {
  const { query } = req.body;
  
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  if (query.length > 1000) {
    return res.status(400).json({ error: 'Query too long' });
  }
  
  next();
};
```

This LLD provides the detailed technical implementation for each component, including specific code patterns, database schemas, API structures, and security measures.
