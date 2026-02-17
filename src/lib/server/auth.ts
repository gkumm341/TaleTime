import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { and, eq, gt } from 'drizzle-orm';
import { db, getDatabaseDisabledReason, isDatabaseEnabled } from '@/db';
import { userSessions, users } from '@/db/schema';

export const SESSION_COOKIE = 'taletime_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  id: string;
  email: string;
  isPaid: boolean;
};

function assertDatabaseEnabled() {
  if (isDatabaseEnabled()) return;
  const reason = getDatabaseDisabledReason() || 'SQLite is disabled';
  throw new Error(`Database unavailable: ${reason}`);
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  // Minimal sanity check (don’t over-reject valid emails).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  try {
    return bcrypt.compareSync(password, passwordHash);
  } catch {
    return false;
  }
}

export async function createUser(params: { email: string; passwordHash: string }) {
  assertDatabaseEnabled();
  const id = randomUUID();
  const now = Date.now();

  await db
    .insert(users)
    .values({
      id,
      email: params.email,
      passwordHash: params.passwordHash,
      isPaid: 0,
      createdAt: now,
    })
    .run();

  return { id };
}

export async function createSession(params: { userId: string }) {
  assertDatabaseEnabled();
  const id = randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;

  await db
    .insert(userSessions)
    .values({
      id,
      userId: params.userId,
      createdAt: now,
      expiresAt,
    })
    .run();

  return { id, expiresAt };
}

export async function deleteSession(sessionId: string) {
  assertDatabaseEnabled();
  await db.delete(userSessions).where(eq(userSessions.id, sessionId)).run();
}

export async function getUserByEmail(email: string) {
  assertDatabaseEnabled();
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  return user ?? null;
}

export async function getUserFromSessionId(sessionId: string | null | undefined): Promise<SessionUser | null> {
  if (!isDatabaseEnabled()) return null;
  if (!sessionId) return null;

  const now = Date.now();
  const session = await db.query.userSessions.findFirst({
    where: and(eq(userSessions.id, sessionId), gt(userSessions.expiresAt, now)),
  });

  if (!session) return null;

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    isPaid: Boolean(user.isPaid),
  };
}

export async function markUserPaid(userId: string) {
  assertDatabaseEnabled();
  await db.update(users).set({ isPaid: 1 }).where(eq(users.id, userId)).run();
}
