import { PageHead } from './PageHead';
import viewStyles from './Views.module.css';
import { ReserveFlow } from '@/components/ReserveFlow';
import { getFlags } from '@/server/settings';
import { addDays, isoDateInBerlin } from '@/lib/dates';
import { RESTAURANT } from '@/lib/restaurant';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';

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

  // The banner's date and party size arrive as query parameters; anything odd
  // falls back to today and a table for two rather than erroring.
  const raw = typeof query.date === 'string' ? query.date : '';
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw >= today ? raw : today;
  const guestsRaw = Number(typeof query.guests === 'string' ? query.guests : '');
  const initialGuests =
    Number.isFinite(guestsRaw) && guestsRaw >= 1 && guestsRaw <= RESTAURANT.reservationMaxPartyOnline
      ? Math.trunc(guestsRaw)
      : 2;

  return (
    <>
      <PageHead label={dict.reserve.live} title={dict.reserve.title} text={dict.reserveBar.subtitle} />

      <div className={`section ${viewStyles.plain}`}>
        <div className="shell">
          <ReserveFlow
            locale={locale}
            dict={dict}
            today={today}
            maxDate={addDays(today, RESTAURANT.reservationMaxDaysAhead)}
            initialDate={initialDate}
            initialGuests={initialGuests}
            enabled={flags.reservationsEnabled}
          />

          {/*
           * The floor plan in the database is a placeholder until the
           * restaurant supplies theirs, and the two published opening-hour sets
           * contradict each other. Both are said here rather than hidden.
           */}
          <div className={viewStyles.notice} style={{ marginTop: '2rem' }}>
            <p>{dict.contact.hoursPending}</p>
            {!flags.reservationAutoConfirm ? <p>{dict.reserve.okRequestedText}</p> : null}
          </div>
        </div>
      </div>
    </>
  );
}
