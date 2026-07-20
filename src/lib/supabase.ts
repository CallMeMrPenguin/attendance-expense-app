import { createClient } from '@supabase/supabase-js';

// Use placeholders during build time if env variables are not set to prevent compilation failure
const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://placeholder-project.supabase.co';

const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MjY4MDQ4MDAsImV4cCI6MTkyMjM4MDgwMH0.placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL is not set. Using placeholder.');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Using placeholder.');
}

// Client-side public Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let _adminClient: ReturnType<typeof createClient> | null = null;

// Server-side admin Supabase client (only use in API routes/Server components)
export const getSupabaseAdmin = () => {
  if (!_adminClient) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey; // Fallback to anon key for build safety
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Using fallback.');
    }
    _adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _adminClient;
};
