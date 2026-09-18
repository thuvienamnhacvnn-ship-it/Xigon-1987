/**
 * Dates in the restaurant's own timezone.
 *
 * The server may run anywhere; a Berlin restaurant's "today" is the only today
 * that matters for a booking form, so every calendar boundary is computed in
 * Europe/Berlin rather than in UTC or in the host's local zone.
 */
import { RESTAURANT } from './restaurant';
import type { ContentLocale, Locale } from './i18n';

const ISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: RESTAURANT.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD, as the `<input type="date">` value expects it. */
export function isoDateInBerlin(at: Date = new Date()): string {
  return ISO.format(at);
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

const DATE_FORMAT_LOCALE: Record<ContentLocale, string> = { de: 'de-DE', en: 'en-GB', vi: 'vi-VN' };

export function formatDate(isoDate: string, locale: Locale): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(DATE_FORMAT_LOCALE[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Minutes past midnight → 19:30. Kept locale-independent: Berlin uses 24h. */
export function formatMinute(minute: number): string {
  const hour = Math.floor(minute / 60) % 24;
  return `${String(hour).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}
