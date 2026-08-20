import { NextResponse } from 'next/server';

import { getUserUrls } from '@/lib/url-storage';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const urls = await getUserUrls(supabase, user.id);
    return NextResponse.json({ urls });
  } catch (error) {
    console.error('List URLs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
