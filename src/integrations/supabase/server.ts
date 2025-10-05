import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://wjqlqmepnpvaywfbfpxb.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "your-service-role-key";

// Server-side Supabase client with service role key
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Client for server-side operations that need user context
export const createServerClient = (accessToken?: string) => {
  return createClient<Database>(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "", {
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`
      } : {}
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
