-- Database schema for search threads/conversations
-- Run this SQL in your Supabase SQL Editor

-- Create search_threads table
CREATE TABLE IF NOT EXISTS search_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create search_thread_results table to store results for each thread
CREATE TABLE IF NOT EXISTS search_thread_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES search_threads(id) ON DELETE CASCADE NOT NULL,
  result_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE search_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_thread_results ENABLE ROW LEVEL SECURITY;

-- Create policies for search_threads
DROP POLICY IF EXISTS "Users can view own threads" ON search_threads;
DROP POLICY IF EXISTS "Users can insert own threads" ON search_threads;
DROP POLICY IF EXISTS "Users can update own threads" ON search_threads;
DROP POLICY IF EXISTS "Users can delete own threads" ON search_threads;

CREATE POLICY "Users can view own threads" ON search_threads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own threads" ON search_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads" ON search_threads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads" ON search_threads
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for search_thread_results
DROP POLICY IF EXISTS "Users can view own thread results" ON search_thread_results;
DROP POLICY IF EXISTS "Users can insert own thread results" ON search_thread_results;
DROP POLICY IF EXISTS "Users can delete own thread results" ON search_thread_results;

CREATE POLICY "Users can view own thread results" ON search_thread_results
  FOR SELECT USING (
    thread_id IN (
      SELECT id FROM search_threads WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own thread results" ON search_thread_results
  FOR INSERT WITH CHECK (
    thread_id IN (
      SELECT id FROM search_threads WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own thread results" ON search_thread_results
  FOR DELETE USING (
    thread_id IN (
      SELECT id FROM search_threads WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_threads_user_id ON search_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_search_threads_created_at ON search_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_thread_results_thread_id ON search_thread_results(thread_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_search_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_search_threads_updated_at ON search_threads;
CREATE TRIGGER update_search_threads_updated_at
  BEFORE UPDATE ON search_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_search_thread_timestamp();

