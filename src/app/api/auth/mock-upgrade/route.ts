import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSessionId, markUserPaid } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development' && process.env.MOCK_PAYMENTS !== 'true') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const sessionId = req.cookies.get('taletime_session')?.value;
  const user = await getUserFromSessionId(sessionId);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  await markUserPaid(user.id);
  return NextResponse.json({ ok: true });
}
