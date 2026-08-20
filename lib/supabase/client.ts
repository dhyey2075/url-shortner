import { createBrowserClient } from '@supabase/ssr';

import { getSupabaseEnv } from './shared';

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
