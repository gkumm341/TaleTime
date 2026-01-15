'use client';

import { useEffect, useState } from 'react';
import type { PremiumEntitlement } from '@/lib/entitlements';

export type MyEntitlementsResponse = {
  authenticated: boolean;
  entitlement: PremiumEntitlement | null;
  isActive: boolean;
};

export function useMyEntitlements() {
  const [data, setData] = useState<MyEntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/entitlements/me', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Failed to load entitlements (${res.status})`);
        }

        const json = (await res.json()) as MyEntitlementsResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
