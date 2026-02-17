'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/LanguageProvider';

type AuthUser = {
  id: string;
  email: string;
  isPaid: boolean;
};

type MeResponse = { user: AuthUser | null };

function messageFromUnknown(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return 'Request failed';
}

export function AuthButtons({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const openAccess = process.env.NEXT_PUBLIC_OPEN_ACCESS !== 'false';
  const { t, localizePath } = useI18n();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (openAccess) {
    return null;
  }

  const refresh = async () => {
    try {
      setError(null);
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load session');
      const json = (await res.json()) as MeResponse;
      setUser(json.user ?? null);
    } catch (e: unknown) {
      setError(messageFromUnknown(e));
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      await refresh();
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="text-xs text-gray-500 dark:text-gray-400">{t('auth.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={className}>
        {error && !compact && (
          <div className="mb-2 text-xs text-rose-600">{error}</div>
        )}
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size={compact ? 'sm' : 'default'}>
            <Link href={localizePath('/signin')}>{t('auth.signIn')}</Link>
          </Button>
          <Button asChild variant="default" size={compact ? 'sm' : 'default'}>
            <Link href={localizePath('/register')}>{t('auth.register')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {!compact && (
          <div className="text-xs text-gray-600 dark:text-gray-300 max-w-[14rem] truncate">
            {user.email}
            {user.isPaid ? (
              <span className="ml-2 text-[11px] font-semibold text-tt-tertiary">{t('auth.paid')}</span>
            ) : (
              <span className="ml-2 text-[11px] font-semibold text-tt-accent">{t('auth.free')}</span>
            )}
          </div>
        )}
        <Button asChild variant="outline" size={compact ? 'sm' : 'default'}>
          <Link href={localizePath('/account')}>{t('auth.account')}</Link>
        </Button>
        <Button variant="ghost" size={compact ? 'sm' : 'default'} onClick={signOut}>
          {t('auth.signOut')}
        </Button>
      </div>
    </div>
  );
}
