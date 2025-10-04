import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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

export function createServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('Service role key not available. This function requires server-side access.');
  }
  
  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey);
}

export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}