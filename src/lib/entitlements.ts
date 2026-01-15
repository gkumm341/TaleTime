export const PURCHASE_SOURCES = ['web', 'ios_iap', 'android_iap'] as const;
export type PurchaseSource = (typeof PURCHASE_SOURCES)[number];

export const PLANS = ['premium_monthly'] as const;
export type PlanId = (typeof PLANS)[number];

export type PremiumEntitlement = {
  plan: PlanId | string;
  purchaseSource: PurchaseSource;
  expiresAt: number; // unix ms
};

export type PremiumFeature =
  | 'narration'
  | 'bedtime_retellings'
  | 'animation'
  | 'videos'
  | 'ai_story_creator';

export function isPremiumActive(entitlement: PremiumEntitlement | null | undefined, now = Date.now()): boolean {
  return Boolean(entitlement && entitlement.expiresAt > now);
}

export function canAccessPremiumFeature(
  _feature: PremiumFeature,
  entitlement: PremiumEntitlement | null | undefined,
  now = Date.now()
): boolean {
  // For now, all premium features require an active premium entitlement.
  // Later you can introduce per-plan/per-feature mapping here.
  return isPremiumActive(entitlement, now);
}
