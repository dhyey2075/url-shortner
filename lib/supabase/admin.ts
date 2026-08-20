import { createClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from './shared';

const { url, serviceRoleKey } = getSupabaseEnv();

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
}

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
