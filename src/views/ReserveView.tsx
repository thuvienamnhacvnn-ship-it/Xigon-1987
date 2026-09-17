import { ReserveBoard, type InitialAvailability } from '@/components/app/ReserveBoard';
import { availability } from '@/server/reservations';
import { getFlags } from '@/server/settings';
import { isoDateInBerlin } from '@/lib/dates';
import { RESTAURANT } from '@/lib/restaurant';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';

/**
 * Reservieren.
 *
 * The free times are computed here, on the server, and rendered with the page.
 * The screen used to arrive empty and make the guest press a button to discover
 * whether anything was free at all — which is three interactions before it says
 * anything anyone can act on, and a screen with nothing on it is exactly what a
 * booking page must not be.
 */
export async function ReserveView({
  locale,
  dict,
  query,
}: {
  locale: Locale;
  dict: Dictionary;
  query: Record<string, string | string[] | undefined>;
}) {
  const flags = await getFlags();
  const today = isoDateInBerlin();

  // The dock and the banner may arrive with a date and a party size; anything
  // odd falls back to today and a table for two rather than erroring.
  const raw = typeof query.date === 'string' ? query.date : '';
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw >= today ? raw : today;
  const guestsRaw = Number(typeof query.guests === 'string' ? query.guests : '');
  const initialGuests =
    Number.isFinite(guestsRaw) && guestsRaw >= 1 && guestsRaw <= RESTAURANT.reservationMaxPartyOnline
      ? Math.trunc(guestsRaw)
      : 2;

  const found = await availability(initialDate, initialGuests);
  const initial: InitialAvailability =
    found.kind === 'ok'
      ? {
          kind: 'ok',
          slots: found.slots,
          durationMinutes: found.durationMinutes,
          hoursConfirmed: found.hoursConfirmed,
        }
      : { kind: found.kind };

  return (
    <ReserveBoard
      locale={locale}
      dict={dict}
      initialDate={initialDate}
      initialGuests={initialGuests}
      initial={initial}
      autoConfirm={flags.reservationAutoConfirm}
      enabled={flags.reservationsEnabled}
    />
  );
}
