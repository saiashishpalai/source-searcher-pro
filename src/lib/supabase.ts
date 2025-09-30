import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wjqlqmepnpvaywfbfpxb.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqcWxxbWVwbnB2YXl3ZmJmcHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzMzNTcsImV4cCI6MjA3NDgwOTM1N30.pwRxkIQvPKVQxKEtjBLzS1TfyPZfo0g7lXwKZGAVIOM'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqcWxxbWVwbnB2YXl3ZmJmcHhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzMzM1NywiZXhwIjoyMDc0ODA5MzU3fQ.f87M1nU2TU1J2e-sxM9agH0DYd3bD8CTJBA0V3VvhMc'

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For use in Client Components
export const createSupabaseClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey)

// For server-side operations - only create if we have the service role key
export const supabaseAdmin = supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null

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
