'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, Locale, messages } from '@/i18n/messages';

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'taletime-language';

function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'es' || value === 'el' || value === 'pt-BR' || value === 'de';
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;

  return Object.entries(vars).reduce((acc, [key, value]) => {
    return acc.replaceAll(`{${key}}`, String(value));
  }, template);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isLocale(stored)) {
      setLocaleState(stored);
      return;
    }

    const nav = navigator.language;
    if (isLocale(nav)) {
      setLocaleState(nav);
      return;
    }

    if (nav.startsWith('pt')) setLocaleState('pt-BR');
    else if (nav.startsWith('es')) setLocaleState('es');
    else if (nav.startsWith('de')) setLocaleState('de');
    else if (nav.startsWith('el')) setLocaleState('el');
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    const value = messages[locale][key] ?? messages[DEFAULT_LOCALE][key] ?? key;
    return interpolate(value, vars);
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
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
