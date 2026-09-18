/**
 * Localisation and localised routing.
 *
 * German is primary. Each route carries its own slug per locale, so
 * /de/speisekarte and /en/menu are the same page under two honest URLs, and a
 * page rejects a slug belonging to another locale instead of quietly serving a
 * duplicate.
 *
 * Vietnamese was published and has been taken down again. The translations are
 * still in the dictionaries and the `vi` columns are still in the database —
 * nothing was deleted, because turning a language back on should be a matter of
 * putting `'vi'` back in this list rather than translating the site twice.
 * Everything else keys off this array: the switcher, the routing table, the
 * proxy's language negotiation and what `tr()` will look at.
 */

export const locales = ['de', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'de';

/**
 * Every language the site has words for, served or not.
 *
 * Kept apart from `locales` so that taking a language off the site does not
 * mean deleting its slugs, its dictionary and its database columns — which
 * would make putting it back a translation job rather than a one-line change.
 * Tables of content are keyed by this; anything the guest can reach is keyed by
 * `Locale`.
 */
export const contentLocales = ['de', 'en', 'vi'] as const;
export type ContentLocale = (typeof contentLocales)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export type RouteKey =
  | 'home'
  | 'experience'
  | 'menu'
  | 'dish'
  | 'order'
  | 'cart'
  | 'checkout'
  | 'orderStatus'
  | 'reserve'
  | 'reservation'
  | 'offers'
  | 'assistant'
  | 'restaurant'
  | 'contact'
  | 'promoAdmin'
  | 'admin'
  | 'imprint'
  | 'privacy'
  | 'orderTerms';

export const routes: Record<RouteKey, Record<ContentLocale, string>> = {
  home: { de: '', en: '', vi: '' },
  /*
   * One screen, one URL. The dock switches the content area and the address
   * bar together, so Back, Forward and a pasted link all land in the same
   * place — which is the whole difference between an app and a long page.
   */
  experience: { de: 'erleben', en: 'experience', vi: 'trai-nghiem' },
  menu: { de: 'speisekarte', en: 'menu', vi: 'menu' },
  dish: { de: 'speisekarte/:slug', en: 'menu/:slug', vi: 'menu/:slug' },
  order: { de: 'bestellen', en: 'order', vi: 'order' },
  cart: { de: 'warenkorb', en: 'cart', vi: 'cart' },
  checkout: { de: 'checkout', en: 'checkout', vi: 'checkout' },
  orderStatus: { de: 'bestellung/:token', en: 'order-status/:token', vi: 'order-status/:token' },
  reserve: { de: 'reservieren', en: 'reserve', vi: 'reserve' },
  reservation: { de: 'reservierung/:token', en: 'reservation/:token', vi: 'reservation/:token' },
  offers: { de: 'angebote', en: 'offers', vi: 'uu-dai' },
  assistant: { de: 'ki-berater', en: 'ai-guide', vi: 'tro-ly' },
  restaurant: { de: 'restaurant', en: 'restaurant', vi: 'restaurant' },
  promoAdmin: { de: 'aktionen', en: 'promotions', vi: 'promotions' },
  // The back office keeps one path in every language: staff learn one URL.
  admin: { de: 'admin', en: 'admin', vi: 'admin' },
  contact: { de: 'kontakt', en: 'contact', vi: 'contact' },
  imprint: { de: 'impressum', en: 'imprint', vi: 'imprint' },
  privacy: { de: 'datenschutz', en: 'privacy', vi: 'privacy' },
  orderTerms: { de: 'bestellbedingungen', en: 'order-terms', vi: 'order-terms' },
};

export function hrefFor(locale: Locale, key: RouteKey, params: Record<string, string> = {}): string {
  let segment = routes[key][locale];
  for (const [name, value] of Object.entries(params)) {
    segment = segment.replace(`:${name}`, encodeURIComponent(value));
  }
  return segment ? `/${locale}/${segment}` : `/${locale}`;
}

/**
 * The route whose slug matches, for this locale only.
 *
 * `withParam` disambiguates the pairs that share a head: /de/speisekarte is the
 * card, /de/speisekarte/maki-lachs is one dish. A German slug requested under
 * /en finds nothing, which is the point — the same page never has two URLs.
 */
export function matchRoute(locale: Locale, head: string, withParam: boolean): RouteKey | null {
  const entries = Object.entries(routes) as [RouteKey, Record<Locale, string>][];
  for (const [key, slugs] of entries) {
    const own = slugs[locale];
    if (!own || own.split('/')[0] !== head) continue;
    if (own.includes('/:') === withParam) return key;
  }
  return null;
}

/**
 * Which screen a full path is on, for the shell.
 *
 * The bar and the dock have to mark the current item, and the layout only ever
 * sees the path — not the segments the page was matched with.
 */
export function routeKeyFrom(locale: Locale, pathname: string): RouteKey | null {
  const segments = pathname.split('/').filter(Boolean).slice(1);
  if (!segments.length) return 'experience';
  return matchRoute(locale, segments[0], segments.length > 1);
}

/**
 * Which dock item owns a screen.
 *
 * A dish belongs to the card, a basket and a checkout belong to ordering, a
 * booking belongs to the booking screen. Without this the dock goes blank the
 * moment a guest opens anything, and they lose track of where they are.
 */
export function dockKeyFrom(key: RouteKey | null): RouteKey | null {
  switch (key) {
    case 'dish':
      return 'menu';
    case 'cart':
    case 'checkout':
    case 'orderStatus':
      return 'order';
    case 'reservation':
      return 'reserve';
    default:
      return key;
  }
}

/** Guard for a route file: its folder must be this locale's own slug. */
export function ownsSlug(locale: Locale, key: RouteKey, folderSlug: string): boolean {
  return routes[key][locale].split('/')[0] === folderSlug;
}

/** The same page in another language, for the switcher and hreflang. */
export function switchPath(pathname: string, from: Locale, to: Locale): string {
  const rest = pathname.split('/').slice(2).join('/');
  for (const slugs of Object.values(routes)) {
    const own = slugs[from];
    if (!own) continue;
    const base = own.split('/')[0];
    if (rest === base || rest.startsWith(`${base}/`)) {
      return `/${to}/${slugs[to].split('/')[0]}${rest.slice(base.length)}`;
    }
  }
  return `/${to}`;
}

export const localeShort: Record<ContentLocale, string> = { de: 'DE', en: 'EN', vi: 'VI' };
export const localeLabels: Record<ContentLocale, string> = { de: 'Deutsch', en: 'English', vi: 'Tiếng Việt' };

export type Translated = { de?: string | null; en?: string | null; vi?: string | null };

/**
 * Reads the right language column off a database row.
 *
 * Vietnamese falls back to English before German: an untranslated dish is
 * better served to a Vietnamese reader in English than in German.
 */
export function tr(locale: ContentLocale, values: Translated): string {
  if (locale === 'vi') return values.vi || values.en || values.de || '';
  if (locale === 'en') return values.en || values.de || '';
  return values.de || values.en || '';
}

export function trOrNull(locale: ContentLocale, values: Translated): string | null {
  return tr(locale, values) || null;
}
