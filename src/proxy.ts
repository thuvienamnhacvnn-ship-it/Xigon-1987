import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales } from '@/lib/i18n';

/**
 * Every page lives under a locale segment, so the bare root has to go
 * somewhere. German is the house language; the Accept-Language header only
 * gets to override that with a language we actually publish.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))) {
    /*
     * A layout cannot read the path it is rendering. It needs to, because the
     * back office must not be wrapped in the guest-facing navigation, so the
     * path is passed along as a header for the layout to read.
     */
    const forward = new Headers(request.headers);
    forward.set('x-pathname', pathname);
    return NextResponse.next({ request: { headers: forward } });
  }

  const header = request.headers.get('accept-language') ?? '';
  const wanted = header
    .split(',')
    .map((part) => part.split(';')[0].trim().slice(0, 2).toLowerCase())
    .find((code) => (locales as readonly string[]).includes(code));

  const url = request.nextUrl.clone();
  url.pathname = `/${wanted ?? defaultLocale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

/*
 * Everything served as a file rather than a page has to be listed here.
 *
 * Anything not excluded gets a locale pushed in front of it, and a file has no
 * locale — `/uploads/promo/x.webp` became `/de/uploads/promo/x.webp` and
 * answered 404, which meant every picture an admin uploaded for an offer was
 * broken on the live site while looking perfectly fine in the back office.
 * A new folder under `public/` needs a new name in this list.
 */
export const config = {
  matcher: ['/((?!api|_next|img|fonts|uploads|favicon.ico|robots.txt|sitemap.xml).*)'],
};
