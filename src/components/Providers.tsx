'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { PWAInstallPrompt, OfflineBanner } from '@/components/PWAComponents';
import { LanguageProvider } from '@/components/LanguageProvider';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import type { Locale } from '@/i18n/routing';

export function Providers({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  return (
    <LanguageProvider initialLocale={initialLocale}>
      <CookieConsentProvider>
        <PreferencesProvider>
          <ThemeProvider>
            <OfflineBanner />
            <PWAInstallPrompt />
            <CookieConsentBanner />
            {children}
          </ThemeProvider>
        </PreferencesProvider>
      </CookieConsentProvider>
    </LanguageProvider>
  );
}
