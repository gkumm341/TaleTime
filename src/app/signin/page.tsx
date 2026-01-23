'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get('next') || '/', [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as unknown;
        const msg =
          json && typeof json === 'object' && 'error' in json && typeof (json as { error?: unknown }).error === 'string'
            ? (json as { error: string }).error
            : 'Sign in failed';
        throw new Error(msg);
      }

      router.push(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-tt-gradient-soft flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-tt-surface/90 dark:bg-gray-900/90 backdrop-blur rounded-tt border border-white/50 shadow-xl p-6">
          <h1 className="text-2xl font-bold text-tt-primary dark:text-white">Sign in</h1>
          <p className="text-sm text-tt-muted dark:text-gray-400 mt-1">
            Access your account to unlock bedtime stories.
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-tt-muted dark:text-gray-300 mb-2">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-tt border border-tt-border dark:border-gray-700 bg-tt-surface dark:bg-gray-800 text-tt-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-tt-tertiary"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-tt-muted dark:text-gray-300 mb-2">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full px-4 py-3 rounded-tt border border-tt-border dark:border-gray-700 bg-tt-surface dark:bg-gray-800 text-tt-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-tt-tertiary"
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
              />
            </div>

            <Button onClick={submit} disabled={loading} className="w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

            <div className="text-sm text-tt-muted dark:text-gray-400">
              Don&apos;t have an account?{' '}
              <Link className="text-tt-tertiary font-semibold hover:underline" href={`/register?next=${encodeURIComponent(next)}`}>
                Register
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
