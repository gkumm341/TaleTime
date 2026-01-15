import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSessionId, SESSION_COOKIE } from '@/lib/server/auth';
import { recordPremiumPurchaseEvent, upsertPremiumEntitlement } from '@/lib/server/entitlements';

export const runtime = 'nodejs';

// POST /api/entitlements/mock-grant
// Dev-only helper to simulate a successful web purchase.
export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }

    const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
    const user = await getUserFromSessionId(sessionId);

    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    await recordPremiumPurchaseEvent({
      userId: user.id,
      purchaseSource: 'web',
      plan: 'premium_monthly',
      expiresAt,
      providerTransactionId: 'dev-mock',
      rawReceipt: null,
    });

    await upsertPremiumEntitlement({
      userId: user.id,
      purchaseSource: 'web',
      plan: 'premium_monthly',
      expiresAt,
      providerRef: 'dev-mock',
    });

    return NextResponse.json({ success: true, expiresAt });
  } catch (error) {
    console.error('Entitlements mock-grant error:', error);
    return NextResponse.json({ error: 'Failed to grant entitlement' }, { status: 500 });
  }
}
