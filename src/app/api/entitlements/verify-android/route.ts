import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// POST /api/entitlements/verify-android
// Future: accept Android purchase token, validate with Google Play, then upsert premium_entitlements.
export async function POST() {
  return NextResponse.json(
    {
      error: 'Not implemented yet',
      next: 'Add Google Play verification here and write to premium_entitlements / premium_purchase_events.',
    },
    { status: 501 }
  );
}
