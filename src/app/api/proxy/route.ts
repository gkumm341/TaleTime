import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LOCAL_ONLY = process.env.LOCAL_ONLY === 'true';

const ALLOW_HOSTS = (process.env.ALLOW_HOSTS || '')
  .split(',')
  .map(h => h.trim())
  .filter(Boolean)
  .map(h => new RegExp(h.replace(/\./g, '\\.') + '$'));

function isAllowedHost(hostname: string): boolean {
  return ALLOW_HOSTS.some((pattern) => pattern.test(hostname));
}

async function proxyRequest(req: NextRequest, method: 'GET' | 'HEAD') {
  if (LOCAL_ONLY) {
    return NextResponse.json(
      { error: 'Proxy disabled in LOCAL_ONLY mode' },
      { status: 403 }
    );
  }

  const targetUrlRaw = req.nextUrl.searchParams.get('url');
  if (!targetUrlRaw) {
    return NextResponse.json({ error: 'Missing url query parameter' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(targetUrlRaw);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    return NextResponse.json({ error: 'Only http/https protocols are allowed' }, { status: 400 });
  }

  if (!isAllowedHost(target.hostname)) {
    return NextResponse.json(
      { error: `Host not allowed: ${target.hostname}` },
      { status: 403 }
    );
  }

  const forwardedHeaders = new Headers();
  const range = req.headers.get('range');
  if (range) {
    forwardedHeaders.set('Range', range);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method,
      headers: forwardedHeaders,
      redirect: 'follow',
      cache: 'no-store',
    });
  } catch (error) {
    console.error('Proxy upstream fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch upstream URL' }, { status: 502 });
  }

  const responseHeaders = new Headers();
  const passHeaders = [
    'content-type',
    'content-length',
    'accept-ranges',
    'content-range',
    'etag',
    'last-modified',
    'cache-control',
  ];

  for (const header of passHeaders) {
    const value = upstream.headers.get(header);
    if (value) responseHeaders.set(header, value);
  }

  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type');

  return new Response(method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest) {
  return proxyRequest(req, 'GET');
}

export async function HEAD(req: NextRequest) {
  return proxyRequest(req, 'HEAD');
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
