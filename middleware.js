import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl;

  // Intercept requests going to /api/v1/ or /minio/
  if (url.pathname.startsWith('/api/v1/') || url.pathname.startsWith('/minio/')) {
    const requestHeaders = new Headers(request.headers);
    
    // Add the secret signature header stored safely in Vercel env variables
    requestHeaders.set('X-SBA-Signature', process.env.SBA_VERCEL_SECRET || '');

    // Construct backend target URL (e.g., https://api.yourdomain.com/api/v1/...)
    let targetBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8080';
    if (url.pathname.startsWith('/minio/')) {
      targetBaseUrl = process.env.MINIO_API_URL || 'http://localhost:9000';
    }

    const targetUrl = new URL(url.pathname + url.search, targetBaseUrl);

    return NextResponse.rewrite(targetUrl, {
      request: {
        headers: requestHeaders,
      },
    });
  }
}
