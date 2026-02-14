'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { messages } from '@/i18n/messages';
import {
  DEFAULT_LOCALE,
  Locale,
  getLocaleFromPath,
  normalizeLocale,
  withLocalePath,
} from '@/i18n/routing';

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  localizePath: (path: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'taletime-language';

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;

  return Object.entries(vars).reduce((acc, [key, value]) => {
    return acc.replaceAll(`{${key}}`, String(value));
  }, template);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const localeFromPath = pathname ? getLocaleFromPath(pathname) : null;
    if (localeFromPath) {
      setLocaleState(localeFromPath);
      localStorage.setItem(STORAGE_KEY, localeFromPath);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    const normalizedStored = normalizeLocale(stored);
    if (normalizedStored) {
      setLocaleState(normalizedStored);
      return;
    }

    const nav = navigator.language;
    const normalizedNav = normalizeLocale(nav);
    if (normalizedNav) {
      setLocaleState(normalizedNav);
      return;
    }

    setLocaleState(DEFAULT_LOCALE);
  }, [pathname]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);

    const currentPath = pathname || '/';
    const localizedPath = withLocalePath(currentPath, next);
    const queryString = searchParams.toString();
    const target = queryString ? `${localizedPath}?${queryString}` : localizedPath;
    router.replace(target);
  };

  const localizePath = (path: string) => withLocalePath(path, locale);

  const t = (key: string, vars?: Record<string, string | number>) => {
    const value = messages[locale][key] ?? messages[DEFAULT_LOCALE][key] ?? key;
    return interpolate(value, vars);
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      localizePath,
    }),
    [locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within LanguageProvider');
  }
  return context;
}
