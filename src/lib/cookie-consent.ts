export type CookieConsentStatus = 'unset' | 'accepted' | 'declined';

export const COOKIE_CONSENT_COOKIE = 'taletime-cookie-consent';

export const OPTIONAL_COOKIE_NAMES = [
  '_ga',
  '_gid',
  '_gat',
  '_fbp',
  '_hjSessionUser',
  '_hjSession',
  'taletime-analytics',
  'taletime-marketing',
];

type CookieWriteOptions = {
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function isBrowser() {
  return typeof document !== 'undefined';
}

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const encodedName = encodeURIComponent(name);
  const segments = document.cookie ? document.cookie.split('; ') : [];
  for (const segment of segments) {
    if (!segment.startsWith(`${encodedName}=`)) continue;
    return decodeURIComponent(segment.slice(encodedName.length + 1));
  }
  return null;
}

function writeCookie(name: string, value: string, options: CookieWriteOptions = {}) {
  if (!isBrowser()) return;

  const path = options.path ?? '/';
  const sameSite = options.sameSite ?? 'lax';
  const maxAge = options.maxAge ?? ONE_YEAR_SECONDS;
  const secure = options.secure ?? window.location.protocol === 'https:';

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`;

  if (secure) {
    cookie += '; secure';
  }

  document.cookie = cookie;
}

function expireCookie(name: string, path: string, domain?: string) {
  if (!isBrowser()) return;
  let cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; max-age=0; samesite=lax`;
  if (domain) {
    cookie += `; domain=${domain}`;
  }
  if (window.location.protocol === 'https:') {
    cookie += '; secure';
  }
  document.cookie = cookie;
}

export function getCookieConsentStatus(): CookieConsentStatus {
  const raw = readCookie(COOKIE_CONSENT_COOKIE);
  if (raw === 'accepted' || raw === 'declined') {
    return raw;
  }
  return 'unset';
}

export function setCookieConsentStatus(status: Exclude<CookieConsentStatus, 'unset'>) {
  writeCookie(COOKIE_CONSENT_COOKIE, status);
}

export function canUseNonEssentialCookies() {
  return getCookieConsentStatus() === 'accepted';
}

export function setNonEssentialCookie(name: string, value: string, options: CookieWriteOptions = {}) {
  if (!canUseNonEssentialCookies()) {
    return false;
  }
  writeCookie(name, value, options);
  return true;
}

export function clearOptionalCookies() {
  if (!isBrowser()) return;

  const host = window.location.hostname;
  const domainVariants = new Set<string>();
  if (host) {
    domainVariants.add(host);
    if (host.includes('.')) {
      domainVariants.add(`.${host}`);
    }
  }

  for (const name of OPTIONAL_COOKIE_NAMES) {
    expireCookie(name, '/');
    for (const domain of domainVariants) {
      expireCookie(name, '/', domain);
    }
  }
}
