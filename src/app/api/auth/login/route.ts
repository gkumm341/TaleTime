import { NextRequest, NextResponse } from 'next/server';
import { createSession, getUserByEmail, isValidEmail, normalizeEmail, verifyPassword } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = normalizeEmail(String(body.email ?? ''));
    const password = String(body.password ?? '');

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Missing password' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const session = await createSession({ userId: user.id });

    const res = NextResponse.json({ ok: true });
    res.cookies.set('taletime_session', session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
  }
}
