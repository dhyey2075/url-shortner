import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

/**
 * Server-side Supabase client using the secret service_role key.
 * Use this in API routes, Server Components, and Route Handlers.
 * Never expose the service role key to the client.
 */
function createServerClient(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local (see .env.example).'
    );
  }
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (see .env.example).'
    );
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Client-side Supabase client using the publishable anon key.
 * Call this only in Client Components (e.g. createClient(url, anonKey)).
 * Safe to expose; RLS applies. This app uses server-only client below.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for browser client.'
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

/** Server-only client (API routes, redirects). Uses secret SUPABASE_SERVICE_ROLE_KEY. */
export const supabase = createServerClient();

export type UrlRow = {
  id: number;
  created_at: string;
  original_url: string | null;
  shorten_url_code: string | null;
  updated_at: string | null;
};
