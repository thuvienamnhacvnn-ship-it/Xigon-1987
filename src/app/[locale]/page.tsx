import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { hrefFor, isLocale } from '@/lib/i18n';

/**
 * /de has no screen of its own.
 *
 * The site is an app with seven screens and no landing page above them, so the
 * bare locale root sends the guest to the first one. A redirect rather than
 * rendering Erleben here, because a screen with two URLs is a screen the Back
 * button lies about.
 */
export default async function LocaleRoot({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  redirect(hrefFor(locale, 'experience'));
}
