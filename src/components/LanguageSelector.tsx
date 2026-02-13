'use client';

import { useI18n } from '@/components/LanguageProvider';
import { Locale } from '@/i18n/messages';

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="space-y-1">
      <label htmlFor="language-selector" className="text-xs font-semibold text-tt-primary">
        {t('language.label')}
      </label>
      <select
        id="language-selector"
        className="tt-input px-3 py-2 w-full"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="el">Ελληνικά</option>
        <option value="pt-BR">Português (Brasil)</option>
        <option value="de">Deutsch</option>
      </select>
    </div>
  );
}
