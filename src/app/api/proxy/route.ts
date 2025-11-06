import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOW_HOSTS = (process.env.ALLOW_HOSTS || 'gutenberg.org,standardebooks.org')
  .split(',')
  .map(h => new RegExp(h.replace(/\./g, '\\.') + '$'));

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get('url');
  
  if (!src) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Check allowlist
  if (!ALLOW_HOSTS.some((re) => re.test(url.hostname))) {
    return NextResponse.json(
      { error: `Blocked host: ${url.hostname}` },
      { status: 403 }
    );
  }

  try {
    // Prepare headers for upstream request
    const upstreamHeaders: Record<string, string> = {};
    const range = req.headers.get('range');
    if (range) {
      upstreamHeaders['Range'] = range;
    }

    // Fetch from upstream
    const upstream = await fetch(src, {
      headers: upstreamHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: 'Upstream error', status: upstream.status },
        { status: upstream.status }
      );
    }

    // Build response headers
    const responseHeaders = new Headers();
    
    // Content-Type
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    responseHeaders.set('Content-Type', contentType);
    
    // Range support
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }
    
    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';
    responseHeaders.set('Accept-Ranges', acceptRanges);
    
    // Content-Length
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }
    
    // Caching headers
    responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type');

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}
