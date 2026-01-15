'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { CacheManager } from '@/components/CacheManager';
import { PWAInstallPrompt, OfflineBanner } from '@/components/PWAComponents';
import { PremiumBenefits } from '@/components/PremiumBenefits';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      <ThemeProvider>
        <CacheManager />
        <OfflineBanner />
        <PWAInstallPrompt />
        <PremiumBenefits />
        {children}
      </ThemeProvider>
    </PreferencesProvider>
  );
}
