import { NextRequest, NextResponse } from 'next/server';

import { isValidOtpToken } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const token = String(body?.token ?? '').trim();

    if (!email || !isValidOtpToken(token)) {
      return NextResponse.json(
        { error: 'Valid email and 6-digit OTP are required.' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { error: signupError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });

    if (signupError) {
      const { error: emailError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (emailError) {
        return NextResponse.json({ error: emailError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
