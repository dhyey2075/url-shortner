import { NextRequest, NextResponse } from 'next/server';
import { urlStorage } from '@/lib/url-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldShortCode, newShortCode, originalUrl } = body;

    if (!oldShortCode || !newShortCode || !originalUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate short code format (alphanumeric, no spaces)
    if (!/^[a-zA-Z0-9]+$/.test(newShortCode)) {
      return NextResponse.json(
        { error: 'Short code can only contain letters and numbers' },
        { status: 400 }
      );
    }

    // Update the short code
    const success = urlStorage.updateShortCode(oldShortCode, newShortCode, originalUrl);

    if (!success) {
      return NextResponse.json(
        { error: 'Short code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Short code updated successfully',
    });
  } catch (error) {
    console.error('Error updating short code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

