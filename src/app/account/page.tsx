'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type AuthUser = {
  id: string;
  email: string;
  isPaid: boolean;
};

type MeResponse = { user: AuthUser | null };

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get('next') || '/', [searchParams]);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const refresh = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load account');
      const json = (await res.json()) as MeResponse;
      setUser(json.user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load account');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const mockUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await fetch('/api/auth/mock-upgrade', { method: 'POST' });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as unknown;
        const msg =
          json && typeof json === 'object' && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
            ? (json as { error: string }).error
            : 'Upgrade failed';
        throw new Error(msg);
      }
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upgrade failed');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-tt-secondary via-white to-tt-secondary p-4">
        <div className="max-w-2xl mx-auto pt-10">
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-tt border border-white/50 shadow-xl p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account</h1>

            {loading ? (
              <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">Loading…</div>
            ) : !user ? (
              <div className="mt-6">
                <div className="text-sm text-gray-700 dark:text-gray-300">You&apos;re not signed in.</div>
                <div className="mt-4 flex gap-2">
                  <Button asChild variant="default">
                    <Link href={`/signin?next=${encodeURIComponent(next)}`}>Sign in</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/register?next=${encodeURIComponent(next)}`}>Register</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Signed in as <span className="font-semibold">{user.email}</span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Plan: {user.isPaid ? (
                    <span className="font-semibold text-tt-tertiary">Paid (Bedtime unlocked)</span>
                  ) : (
                    <span className="font-semibold text-tt-accent">Free (Bedtime locked)</span>
                  )}
                </div>

                {!user.isPaid && (
                  <div className="rounded-tt border border-tt-border/40 dark:border-tt-border/20 p-4 bg-white/60 dark:bg-gray-900/50">
                    <div className="font-semibold text-gray-900 dark:text-white">Unlock Bedtime</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Payment integration is coming next. For now, you can use a development-only mock upgrade to test the flow.
                    </div>
                    <div className="mt-3">
                      <Button onClick={mockUpgrade} disabled={upgrading}>
                        {upgrading ? 'Upgrading…' : 'Mock upgrade (dev)'}
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Production will use a real checkout provider.
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={() => router.push('/')}>Back to Home</Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
