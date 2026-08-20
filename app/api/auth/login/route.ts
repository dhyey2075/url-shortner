import { NextRequest, NextResponse } from 'next/server';

import { normalizeUsername } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = normalizeUsername(body?.username ?? '');
    const password = String(body?.password ?? '');

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('username', username)
      .limit(1)
      .maybeSingle();

    if (!profile?.email) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
