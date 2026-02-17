import { and, desc, eq, gt } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { db, isDatabaseEnabled } from '@/db';
import { premiumEntitlements, premiumPurchaseEvents } from '@/db/schema';
import { SESSION_COOKIE, getUserFromSessionId } from '@/lib/server/auth';
import type { PremiumEntitlement, PurchaseSource } from '@/lib/entitlements';
import { isPremiumActive } from '@/lib/entitlements';

export async function getPremiumEntitlementForUserId(userId: string): Promise<PremiumEntitlement | null> {
  if (!isDatabaseEnabled()) return null;
  const now = Date.now();
  try {
    const rows = await db
      .select({
        plan: premiumEntitlements.plan,
        purchaseSource: premiumEntitlements.purchaseSource,
        expiresAt: premiumEntitlements.expiresAt,
      })
      .from(premiumEntitlements)
      .where(and(eq(premiumEntitlements.userId, userId), gt(premiumEntitlements.expiresAt, now)))
      .orderBy(desc(premiumEntitlements.expiresAt))
      .limit(1);

    if (rows.length === 0) return null;

    return {
      plan: rows[0].plan,
      purchaseSource: rows[0].purchaseSource as PurchaseSource,
      expiresAt: rows[0].expiresAt,
    };
  } catch (e) {
    // If migrations haven't been run yet, treat as no entitlement.
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('no such table') && message.includes('premium_entitlements')) {
      return null;
    }
    throw e;
  }
}

export async function getPremiumEntitlementForRequest(req: NextRequest): Promise<{
  user: { id: string; email: string } | null;
  entitlement: PremiumEntitlement | null;
}> {
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  const user = await getUserFromSessionId(sessionId);
  if (!user) return { user: null, entitlement: null };

  const entitlement = await getPremiumEntitlementForUserId(user.id);
  return { user: { id: user.id, email: user.email }, entitlement };
}

export async function requireActivePremium(req: NextRequest): Promise<
  | { ok: true; user: { id: string; email: string }; entitlement: PremiumEntitlement }
  | { ok: false; status: 401 | 402; error: string }
> {
  const { user, entitlement } = await getPremiumEntitlementForRequest(req);

  if (!user) {
    return { ok: false, status: 401, error: 'Sign in required' };
  }

  if (!isPremiumActive(entitlement)) {
    return { ok: false, status: 402, error: 'Premium subscription required' };
  }

  return { ok: true, user, entitlement: entitlement! };
}

export async function recordPremiumPurchaseEvent(params: {
  userId: string;
  purchaseSource: PurchaseSource;
  plan: string;
  expiresAt: number;
  providerTransactionId?: string | null;
  rawReceipt?: string | null;
}) {
  if (!isDatabaseEnabled()) return;
  const now = Date.now();

  await db
    .insert(premiumPurchaseEvents)
    .values({
      userId: params.userId,
      purchaseSource: params.purchaseSource,
      plan: params.plan,
      expiresAt: params.expiresAt,
      providerTransactionId: params.providerTransactionId ?? null,
      rawReceipt: params.rawReceipt ?? null,
      createdAt: now,
    })
    .run();
}

export async function upsertPremiumEntitlement(params: {
  userId: string;
  purchaseSource: PurchaseSource;
  plan: string;
  expiresAt: number;
  providerRef?: string | null;
}) {
  if (!isDatabaseEnabled()) return;
  const now = Date.now();

  const existing = await db
    .select({ id: premiumEntitlements.id })
    .from(premiumEntitlements)
    .where(eq(premiumEntitlements.userId, params.userId))
    .orderBy(desc(premiumEntitlements.expiresAt))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(premiumEntitlements)
      .set({
        purchaseSource: params.purchaseSource,
        plan: params.plan,
        expiresAt: params.expiresAt,
        providerRef: params.providerRef ?? null,
        updatedAt: now,
      })
      .where(eq(premiumEntitlements.id, existing[0].id))
      .run();

    return;
  }

  await db
    .insert(premiumEntitlements)
    .values({
      userId: params.userId,
      purchaseSource: params.purchaseSource,
      plan: params.plan,
      expiresAt: params.expiresAt,
      providerRef: params.providerRef ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}
