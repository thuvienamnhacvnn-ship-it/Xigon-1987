/**
 * Money.
 *
 * Amounts are integer cents everywhere — in the database, over the API and in
 * the cart — so nothing is ever rounded twice. Only this file turns them into
 * text.
 */
import type { ContentLocale, Locale } from './i18n';

/**
 * Guests pay euros in Berlin whatever language they read the page in, so the
 * Vietnamese view uses German number formatting (12,90 €) rather than a
 * Vietnamese one. Only English gets its own shape (€12.90).
 */
const FORMAT_LOCALE: Record<ContentLocale, string> = { de: 'de-DE', en: 'en-GB', vi: 'de-DE' };

const cache = new Map<string, Intl.NumberFormat>();

function formatter(locale: Locale, currency: string): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let found = cache.get(key);
  if (!found) {
    found = new Intl.NumberFormat(FORMAT_LOCALE[locale], {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    cache.set(key, found);
  }
  return found;
}

export function formatMoney(cents: number, locale: Locale, currency = 'EUR'): string {
  return formatter(locale, currency).format(cents / 100);
}

/** Sums line items without ever leaving integer arithmetic. */
export function sumCents(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * The tax already contained in a gross price.
 *
 * German menu prices are gross, so VAT is extracted rather than added; the
 * receipt shows it as "inkl. 19 % MwSt."
 */
export function taxIncludedCents(grossCents: number, basisPoints: number): number {
  return Math.round((grossCents * basisPoints) / (10000 + basisPoints));
}
