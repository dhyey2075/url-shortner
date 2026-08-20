import { NextRequest, NextResponse } from 'next/server';

import { getAuthUserByEmail } from '@/lib/auth-admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const existingUser = await getAuthUserByEmail(email);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'No pending signup found for this email. Sign up first.' },
        { status: 404 }
      );
    }

    if (existingUser.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Email is already verified. Please log in.' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/signup/verify`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
