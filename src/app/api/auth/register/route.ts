import { NextRequest, NextResponse } from 'next/server';
import { createSession, createUser, hashPassword, isValidEmail, normalizeEmail } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = normalizeEmail(String(body.email ?? ''));
    const password = String(body.password ?? '');

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    const user = await createUser({ email, passwordHash });
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('constraint')) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
