import { NextRequest, NextResponse } from 'next/server';
import { urlStorage } from '@/lib/url-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;

    const originalUrl = urlStorage.getByCode(shortCode);

    if (!originalUrl) {
      return NextResponse.json(
        { error: 'Short URL not found' },
        { status: 404 }
      );
    }

    // Redirect to the original URL
    return NextResponse.redirect(originalUrl, { status: 301 });
  } catch (error) {
    console.error('Error redirecting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

