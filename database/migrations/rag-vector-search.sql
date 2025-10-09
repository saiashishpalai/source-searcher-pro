-- RAG Vector Search Migration
-- Run this SQL in your Supabase SQL Editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table to store synced documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('slack', 'notion', 'google_drive')),
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  author TEXT,
  mime_type TEXT,
  file_size BIGINT,
  metadata JSONB DEFAULT '{}',
  last_modified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one document per user per source
  UNIQUE(user_id, source_type, source_id)
);

-- Document chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(document_id, chunk_index)
);

-- Search history table
CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  search_time_ms INTEGER,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for document_chunks
CREATE POLICY "Users can view own chunks" ON document_chunks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chunks" ON document_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chunks" ON document_chunks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for search_history
CREATE POLICY "Users can view own search history" ON search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history" ON search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON documents(source_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON document_chunks(user_id);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);

-- CRITICAL: Vector similarity search index using HNSW
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Function to search document chunks using vector similarity
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  metadata jsonb,
  similarity float
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
  WHERE 
    (user_id_param IS NULL OR dc.user_id = user_id_param)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
