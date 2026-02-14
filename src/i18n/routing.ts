export const LOCALES = ['en', 'es', 'el', 'pt-BR', 'de'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  if (isLocale(value)) return value;

  const lower = value.toLowerCase();
  if (lower === 'pt' || lower === 'pt-br') return 'pt-BR';
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('el')) return 'el';
  if (lower.startsWith('de')) return 'de';

  return null;
}

export function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (!first) return null;
  return normalizeLocale(first);
}

export function stripLocaleFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '/';

  const first = normalizeLocale(segments[0]);
  const rest = first ? segments.slice(1) : segments;
  return rest.length > 0 ? `/${rest.join('/')}` : '/';
}

export function withLocalePath(pathname: string, locale: Locale): string {
  const barePath = stripLocaleFromPath(pathname);
  return barePath === '/' ? `/${locale}` : `/${locale}${barePath}`;
}

export function detectLocaleFromAcceptLanguage(headerValue: string | null): Locale {
  if (!headerValue) return DEFAULT_LOCALE;

  const tokens = headerValue.split(',').map((part) => part.split(';')[0]?.trim()).filter(Boolean);
  for (const token of tokens) {
    const locale = normalizeLocale(token);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}
