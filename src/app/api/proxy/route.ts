import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LOCAL_ONLY = process.env.LOCAL_ONLY === 'true';

const ALLOW_HOSTS = (process.env.ALLOW_HOSTS || 'gutenberg.org,standardebooks.org')
  .split(',')
  .map(h => new RegExp(h.replace(/\./g, '\\.') + '$'));

export async function GET(req: NextRequest) {
  // This project is intended to run fully offline/local-only.
  // Proxying arbitrary upstream URLs is disabled to guarantee we never
  // fetch anything from outside this environment.
  return NextResponse.json(
    { error: 'Proxy disabled: external fetching is not allowed in this app' },
    { status: 403 }
  );

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
