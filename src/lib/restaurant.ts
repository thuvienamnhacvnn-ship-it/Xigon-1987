/**
 * The restaurant's own details.
 *
 * Everything here was read off the restaurant's live site on 08.09.2026 and is
 * marked with how confident we are. `confirmed: false` fields are rendered with
 * a caveat rather than as fact — the opening hours in particular contradict
 * themselves across the old site, so the page must not pick a winner.
 *
 * This is the seed for the settings table; the admin edits the database copy.
 */
export const RESTAURANT = {
  name: 'XIGON 1987',
  legalName: null as string | null, // Impressum details unconfirmed — never published as-is

  street: 'Nürnberger Str. 46',
  postalCode: '10789',
  city: 'Berlin',
  country: 'DE',
  latitude: 52.5017,
  longitude: 13.3336,
  transit: 'U-Bhf Augsburger Straße',

  phone: '+49 30 21962569',
  email: 'xigon1987@gmail.com',
  eventEmail: '1987@xigon.berlin',

  instagram: 'https://instagram.com/1987xigon',
  facebook: 'https://www.facebook.com/1987xigon',
  tiktok: null as string | null,
  whatsapp: null as string | null,

  currency: 'EUR',
  taxRateBasisPoints: 1900,
  timezone: 'Europe/Berlin',

  /**
   * What is switched on.
   *
   * Reservations and collection run so the site can actually be used; delivery
   * stays off because no delivery area, fee or minimum has been confirmed, and
   * `demoMode` stays on because no payment provider is connected — no card is
   * ever charged and every page says so.
   */
  reservationsEnabled: true,
  reservationAutoConfirm: false,
  pickupEnabled: true,
  deliveryEnabled: false,
  demoMode: true,

  reservationDurationMinutes: 120,
  reservationBufferMinutes: 15,
  reservationSlotMinutes: 15,
  reservationLastSeatingMinutes: 90,
  reservationMaxPartyOnline: 8,
  reservationMaxDaysAhead: 90,

  orderLeadTimeMinutes: 35,
  orderCutoffMinutes: 30,
  orderSlotMinutes: 15,
  orderSlotCapacity: 4,
  /**
   * How long an unpaid order may hold a slot.
   *
   * It has to be finite. A slot is a real quarter of an hour of a real
   * kitchen's evening, and an order that stopped at "awaiting payment" is one
   * nobody is cooking. Without a limit four abandoned baskets close 19:00 for
   * every guest who comes after them, permanently — and with no payment
   * provider connected yet, every such order is abandoned by definition.
   */
  orderPaymentWindowMinutes: 30,
  deliveryMinimumCents: 2000,

  sourceUrl: 'https://www.1987xigon.de/kontakt/',
  confirmed: false,
} as const;

/**
 * Opening hours.
 *
 * The old site publishes two different sets. Both are kept, neither is treated
 * as the truth, and `operating` is the schedule the demo runs on — labelled as
 * a placeholder everywhere it is shown.
 */
export const HOURS_SOURCES = [
  {
    id: 'homepage',
    label: 'Quelle Startseite',
    opensMinute: 11 * 60,
    closesMinute: 23 * 60,
    url: 'https://www.1987xigon.de/',
  },
  {
    id: 'contact',
    label: 'Quelle Kontaktseite',
    opensMinute: 10 * 60,
    closesMinute: 25 * 60, // 01:00 the next day
    url: 'https://www.1987xigon.de/kontakt/',
  },
] as const;

/** Placeholder schedule for the demo. Replace with confirmed hours before launch. */
export const OPERATING_HOURS = {
  dining: { opensMinute: 12 * 60, closesMinute: 23 * 60 },
  kitchen: { opensMinute: 12 * 60, closesMinute: 22 * 60 + 30 },
  confirmed: false,
} as const;

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

export function mapsQuery(): string {
  return encodeURIComponent(`${RESTAURANT.name}, ${RESTAURANT.street}, ${RESTAURANT.postalCode} ${RESTAURANT.city}`);
}
