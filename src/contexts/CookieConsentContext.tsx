'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  clearOptionalCookies,
  getCookieConsentStatus,
  setCookieConsentStatus,
  type CookieConsentStatus,
} from '@/lib/cookie-consent';

type CookieConsentContextValue = {
  status: CookieConsentStatus;
  canUseNonEssentialCookies: boolean;
  shouldShowBanner: boolean;
  acceptCookies: () => void;
  declineCookies: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CookieConsentStatus>('unset');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStatus(getCookieConsentStatus());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (status === 'declined') {
      clearOptionalCookies();
    }
  }, [status, hydrated]);

  const acceptCookies = () => {
    setCookieConsentStatus('accepted');
    setStatus('accepted');
  };

  const declineCookies = () => {
    setCookieConsentStatus('declined');
    clearOptionalCookies();
    setStatus('declined');
  };

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      status,
      canUseNonEssentialCookies: status === 'accepted',
      shouldShowBanner: hydrated && status === 'unset',
      acceptCookies,
      declineCookies,
    }),
    [status, hydrated]
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return context;
}
