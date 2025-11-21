import { NextRequest, NextResponse } from 'next/server';
import { urlStorage } from '@/lib/url-storage';

// Generate a random short code
function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Validate URL
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Ensure URL has protocol
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }

    if (!isValidUrl(fullUrl)) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check if URL already exists
    const existingCode = urlStorage.getByUrl(fullUrl);
    if (existingCode) {
      return NextResponse.json({
        shortCode: existingCode,
        shortUrl: `${request.nextUrl.origin}/${existingCode}`,
        originalUrl: fullUrl,
      });
    }

    // Generate unique short code
    let shortCode: string;
    do {
      shortCode = generateShortCode();
    } while (urlStorage.hasCode(shortCode));

    // Store the mapping
    urlStorage.set(fullUrl, shortCode);

    return NextResponse.json({
      shortCode,
      shortUrl: `${request.nextUrl.origin}/${shortCode}`,
      originalUrl: fullUrl,
    });
  } catch (error) {
    console.error('Error shortening URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

