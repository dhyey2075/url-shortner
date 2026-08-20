import { NextRequest, NextResponse } from 'next/server';

import {
  isValidPassword,
  isValidUsername,
  normalizeUsername,
} from '@/lib/auth';
import { getAuthUserByEmail } from '@/lib/auth-admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = normalizeUsername(body?.username ?? '');
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');
    const confirmPassword = String(body?.confirmPassword ?? '');

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters (letters, numbers, underscore).' },
        { status: 400 }
      );
    }
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match.' },
        { status: 400 }
      );
    }

    const { data: usernameTaken } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .limit(1)
      .maybeSingle();
    if (usernameTaken) {
      return NextResponse.json(
        { error: 'Username is already taken.' },
        { status: 409 }
      );
    }

    const existingAuthUser = await getAuthUserByEmail(email);
    if (existingAuthUser) {
      return NextResponse.json(
        { error: 'Email is already registered.' },
        { status: 409 }
      );
    }

    const { data: emailTaken } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    if (emailTaken) {
      return NextResponse.json(
        { error: 'Email is already registered.' },
        { status: 409 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
        emailRedirectTo: `${request.nextUrl.origin}/signup/verify`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user?.identities?.length === 0) {
      return NextResponse.json(
        { error: 'Email is already registered.' },
        { status: 409 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Could not create account. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to email. Verify to activate your account.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
