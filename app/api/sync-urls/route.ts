import { NextRequest, NextResponse } from 'next/server';
import { urlStorage } from '@/lib/url-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'URLs must be an array' },
        { status: 400 }
      );
    }

    // Sync all URLs to backend storage
    for (const url of urls) {
      if (url.originalUrl && url.shortCode) {
        // Only add if it doesn't already exist
        if (!(await urlStorage.hasCode(url.shortCode))) {
          await urlStorage.set(url.originalUrl, url.shortCode);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'URLs synced successfully',
    });
  } catch (error) {
    const err = error as { message?: string; code?: string; details?: string };
    const msg = err?.message ?? err?.code ?? (err?.details ?? String(error));
    console.error('Error syncing URLs:', msg, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

