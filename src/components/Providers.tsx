'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { CacheManager } from '@/components/CacheManager';
import { PWAInstallPrompt, OfflineBanner } from '@/components/PWAComponents';
import { LanguageProvider } from '@/components/LanguageProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <PreferencesProvider>
        <ThemeProvider>
          <CacheManager />
          <OfflineBanner />
          <PWAInstallPrompt />
          {children}
        </ThemeProvider>
      </PreferencesProvider>
    </LanguageProvider>
  );
}
