import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_LOCALE,
  getLocaleFromPath,
  stripLocaleFromPath,
  withLocalePath,
} from '@/i18n/routing';

const PUBLIC_FILE = /\.(.*)$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const localeFromPath = getLocaleFromPath(pathname);
  if (localeFromPath) {
    const headers = new Headers(request.headers);
    headers.set('x-locale', localeFromPath);

    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = stripLocaleFromPath(pathname);
    const response = NextResponse.rewrite(targetUrl, {
      request: {
        headers,
      },
    });

    response.cookies.set('taletime-language', localeFromPath, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = withLocalePath(pathname, DEFAULT_LOCALE);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
