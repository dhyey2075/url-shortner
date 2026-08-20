import type { User } from '@supabase/supabase-js';

import { supabaseAdmin } from '@/lib/supabase/admin';

export async function getAuthUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail
    );
    if (match) {
      return match;
    }

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  return null;
}
