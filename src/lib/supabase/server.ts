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

// Use real Supabase credentials
const finalSupabaseUrl = supabaseUrl || 'https://wjqlqmepnpvaywfbfpxb.supabase.co';
const finalSupabaseAnonKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqcWxxbWVwbnB2YXl3ZmJmcHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzMzNTcsImV4cCI6MjA3NDgwOTM1N30.pwRxkIQvPKVQxKEtjBLzS1TfyPZfo0g7lXwKZGAVIOM';
const finalSupabaseServiceKey = supabaseServiceRoleKey || 'your-service-role-key';

export function createServiceClient() {
  if (!supabaseServiceRoleKey) {
    console.warn('Service role key not available. Using fallback for demo purposes.');
  }
  
  return createSupabaseClient(finalSupabaseUrl, finalSupabaseServiceKey);
}

export function createClient() {
  return createSupabaseClient(finalSupabaseUrl, finalSupabaseAnonKey);
}