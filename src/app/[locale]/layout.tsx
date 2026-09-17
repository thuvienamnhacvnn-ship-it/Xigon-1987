import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import '@/styles/fonts.css';
import '@/styles/tokens.css';
import '@/styles/base.css';
import { AppShell } from '@/components/app/AppShell';
import { getDictionary } from '@/lib/dictionary';
import { isLocale, locales, routes, type Locale } from '@/lib/i18n';
import { RESTAURANT } from '@/lib/restaurant';
import { CART_COUNT_COOKIE } from '@/lib/cart-cookie';

export const viewport: Viewport = {
  themeColor: '#101720',
  colorScheme: 'dark',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);

  const description = dict.hero.lines.join(' · ');
  return {
    title: { default: `${RESTAURANT.name} — ${RESTAURANT.city}`, template: `%s — ${RESTAURANT.name}` },
    description,
    // No canonical host is confirmed for this build, so nothing absolute is
    // published that a search engine could pin to the wrong domain.
    alternates: { languages: Object.fromEntries(locales.map((code) => [code, `/${code}`])) },
    openGraph: {
      type: 'website',
      siteName: RESTAURANT.name,
      locale,
      title: `${RESTAURANT.name} — ${RESTAURANT.city}`,
      description,
    },
    robots: RESTAURANT.demoMode ? { index: false, follow: false } : undefined,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);
  const jar = await cookies();
  const cartCount = Number(jar.get(CART_COUNT_COOKIE)?.value ?? 0) || 0;

  /*
   * The back office gets the page and nothing else: no rail, no header, no
   * footer, no menu guide. It is a tool for the people working the floor, and
   * the guest-facing navigation on top of it is only in the way.
   */
  const pathname = (await headers()).get('x-pathname') ?? '';
  const backOffice = pathname.startsWith(`/${locale}/${routes.admin[locale as Locale]}`);

  if (backOffice) {
    return (
      <html lang={locale}>
        <body data-chrome="none">{children}</body>
      </html>
    );
  }

  return (
    <html lang={locale}>
      <body data-demo={RESTAURANT.demoMode ? 'true' : undefined} data-app="true">
        <a href="#main" className="skip-link">
          {dict.nav.skip}
        </a>

        {/*
          * Which screen is current is worked out inside the shell, from the
          * path. This layout does not re-run when the guest moves between two
          * screens that share it, so anything about "where we are" computed
          * here would be frozen at whatever they opened first.
          */}
        <AppShell
          locale={locale as Locale}
          dict={dict}
          cartCount={cartCount}
          demoMode={RESTAURANT.demoMode}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
