import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// POST /api/entitlements/verify-ios
// Future: accept iOS IAP receipt, validate with Apple, then upsert premium_entitlements.
export async function POST() {
  return NextResponse.json(
    {
      error: 'Not implemented yet',
      next: 'Add Apple receipt verification here and write to premium_entitlements / premium_purchase_events.',
    },
    { status: 501 }
  );
}
