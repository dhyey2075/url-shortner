import { NextRequest, NextResponse } from 'next/server';
import { getPublicOriginalUrlByCode } from '@/lib/url-storage';

const REMOVED_PAGE_HTML = (baseUrl: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Link removed – URL Shortener</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      background: #fafafa;
      color: #171717;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0a0a0a; color: #ededed; }
    }
    .card {
      max-width: 28rem;
      width: 100%;
      padding: 2rem;
      border-radius: 0.5rem;
      border: 1px solid #e4e4e7;
      background: #fff;
      text-align: center;
    }
    @media (prefers-color-scheme: dark) {
      .card { background: #18181b; border-color: #27272a; }
    }
    h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; }
    p { color: #71717a; margin: 0 0 1.5rem; font-size: 0.9375rem; }
    @media (prefers-color-scheme: dark) { p { color: #a1a1aa; } }
    a {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: #171717;
      color: #fff;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 500;
      font-size: 0.875rem;
    }
    @media (prefers-color-scheme: dark) {
      a { background: #fafafa; color: #171717; }
    }
    a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <h1>This short link has been removed</h1>
    <p>The owner has deleted or changed this link. It no longer points anywhere.</p>
    <a href="${baseUrl}">Create your own short link</a>
  </div>
</body>
</html>`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;

    const originalUrl = await getPublicOriginalUrlByCode(shortCode);

    if (!originalUrl) {
      const baseUrl = request.nextUrl.origin;
      return new NextResponse(REMOVED_PAGE_HTML(baseUrl), {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
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

