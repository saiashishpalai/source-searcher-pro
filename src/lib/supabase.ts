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

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables. Please check your .env file.')
}

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
