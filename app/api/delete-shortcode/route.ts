import { NextRequest, NextResponse } from 'next/server';
import { removeByCodeForUser } from '@/lib/url-storage';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shortCode } = body;

    if (!shortCode) {
      return NextResponse.json(
        { error: 'Short code is required' },
        { status: 400 }
      );
    }

    // Remove from backend storage
    await removeByCodeForUser(supabase, user.id, shortCode);

    return NextResponse.json({
      success: true,
      message: 'Short code deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting short code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

