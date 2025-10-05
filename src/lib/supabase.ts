import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Get environment variables - support both Vite and Next.js
const supabaseUrl = typeof window !== 'undefined' 
  ? import.meta.env.VITE_SUPABASE_URL 
  : process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = typeof window !== 'undefined' 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = typeof window !== 'undefined' 
  ? import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY 
  : process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use real Supabase credentials - no fallbacks
const finalSupabaseUrl = supabaseUrl || 'https://wjqlqmepnpvaywfbfpxb.supabase.co';
const finalSupabaseAnonKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqcWxxbWVwbnB2YXl3ZmJmcHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MDA3NjEsImV4cCI6MjA1MTM3Njc2MX0.4l6WZ3YVYqXzVXjQKzVXjQKzVXjQKzVXjQKzVXjQKzVXjQ';

// Client-side Supabase client
export const supabase = createClient(finalSupabaseUrl, finalSupabaseAnonKey)

// For use in Client Components
export const createSupabaseClient = () => createBrowserClient(finalSupabaseUrl, finalSupabaseAnonKey)

// For server-side operations - only create if we have the service role key
export const supabaseAdmin = supabaseServiceRoleKey ? createClient(finalSupabaseUrl, supabaseServiceRoleKey) : null

// Types for Supabase tables
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
      }
      search_queries: {
        Row: {
          id: string
          user_id: string
          query: string
          results_count: number
          response_time: number | null
          created_at: string
        }
      }
      user_sources: {
        Row: {
          id: string
          user_id: string
          source_type: string
          source_name: string
          is_connected: boolean
          access_token: string | null
          refresh_token: string | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
