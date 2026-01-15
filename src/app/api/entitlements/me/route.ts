import { NextRequest, NextResponse } from 'next/server';
import { isPremiumActive } from '@/lib/entitlements';
import { getPremiumEntitlementForRequest } from '@/lib/server/entitlements';

export const runtime = 'nodejs';

// GET /api/entitlements/me
// Returns the caller's premium entitlement state.
export async function GET(req: NextRequest) {
  try {
    const { user, entitlement } = await getPremiumEntitlementForRequest(req);

    return NextResponse.json({
      authenticated: Boolean(user),
      entitlement,
      isActive: isPremiumActive(entitlement),
    });
  } catch (error) {
    console.error('Entitlements ME error:', error);
    return NextResponse.json({ error: 'Failed to load entitlements' }, { status: 500 });
  }
}
