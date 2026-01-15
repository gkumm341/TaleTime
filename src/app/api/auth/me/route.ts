import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSessionId } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('taletime_session')?.value;
  const user = await getUserFromSessionId(sessionId);

  if (!user) {
    // Clear cookie if stale
    const res = NextResponse.json({ user: null });
    if (sessionId) {
      res.cookies.set('taletime_session', '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
      });
    }
    return res;
  }

  return NextResponse.json({ user });
}
