import { NextRequest, NextResponse } from 'next/server';
import { urlStorage } from '@/lib/url-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shortCode } = body;

    if (!shortCode) {
      return NextResponse.json(
        { error: 'Short code is required' },
        { status: 400 }
      );
    }

    // Remove from backend storage
    urlStorage.removeByCode(shortCode);

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

