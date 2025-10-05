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

// Provide fallback values for development/demo purposes
const fallbackUrl = 'https://demo.supabase.co';
const fallbackAnonKey = 'demo-anon-key';
const fallbackServiceKey = 'demo-service-key';

const finalSupabaseUrl = supabaseUrl || fallbackUrl;
const finalSupabaseAnonKey = supabaseAnonKey || fallbackAnonKey;
const finalSupabaseServiceKey = supabaseServiceRoleKey || fallbackServiceKey;

// Only warn in development if no environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Using fallback values for demo purposes.');
}

export function createServiceClient() {
  if (!supabaseServiceRoleKey) {
    console.warn('Service role key not available. Using fallback for demo purposes.');
  }
  
  return createSupabaseClient(finalSupabaseUrl, finalSupabaseServiceKey);
}

export function createClient() {
  return createSupabaseClient(finalSupabaseUrl, finalSupabaseAnonKey);
}