import Link from 'next/link';
import styles from './Admin.module.css';
import { BookRowActions } from './BookRowActions';
import { NewBooking } from './NewBooking';
import { dayBook } from '@/server/admin';
import { formatDate, formatMinute, addDays } from '@/lib/dates';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';
import type { ReservationChannel } from '@/db/schema';

const CHANNEL_LABEL: Record<ReservationChannel, string> = {
  direct: 'Website',
  phone: 'Telefon',
  walk_in: 'Laufkunde',
  quandoo: 'Quandoo',
  thefork: 'TheFork',
  import: 'Import',
};

/**
 * One service, in time order.
 *
 * Bookings that need a decision are not sorted to the top — they are marked
 * where they sit. A row that jumps out of chronological order is a row nobody
 * can find again when the evening gets busy; the counter at the top says how
 * many there are.
 */
export async function AdminBook({ locale, dict, date }: { locale: Locale; dict: Dictionary; date: string }) {
  const book = await dayBook(date);
  const base = `${hrefFor(locale, 'admin')}/reservierungen`;

  return (
    <div className={styles.page}>
      <header className={styles.dayHead}>
        <div>
          <p className={styles.dayLabel}>{formatDate(date, locale)}</p>
          <p className={styles.dayCounts}>
            <strong>{book.counts.live}</strong> Reservierungen · <strong>{book.counts.covers}</strong> Gäste
            {book.counts.requested > 0 ? (
              <>
                {' · '}
                <span className={styles.warn}>{book.counts.requested} unbestätigt</span>
              </>
            ) : null}
            {book.counts.conflicts > 0 ? (
              <>
                {' · '}
                <span className={styles.danger}>{book.counts.conflicts} ohne Tisch</span>
              </>
            ) : null}
          </p>
        </div>

        <div className={styles.dayNav}>
          <Link href={`${base}?date=${addDays(date, -1)}`} className={styles.dayStep}>
            ← Vortag
          </Link>
          <form action={base} className={styles.dayPick}>
            <input type="date" name="date" defaultValue={date} className="input" />
            <button type="submit" className="btn btn--sm">
              Anzeigen
            </button>
          </form>
          <Link href={`${base}?date=${addDays(date, 1)}`} className={styles.dayStep}>
            Folgetag →
          </Link>
        </div>
      </header>

      <NewBooking locale={locale} date={date} />

      {book.rows.length === 0 ? (
        <p className={styles.empty}>Für diesen Tag ist nichts eingetragen.</p>
      ) : (
        <ul className={styles.rows}>
          {book.rows.map((row) => {
            const cancelled = row.status.startsWith('cancelled') || row.status === 'no_show';
            return (
              <li
                key={row.id}
                className={styles.row}
                data-state={cancelled ? 'off' : undefined}
                data-conflict={row.conflict ? 'true' : undefined}
              >
                <div className={styles.rowTime}>
                  <span className={styles.time}>{formatMinute(row.startMinute)}</span>
                  <span className={styles.until}>bis {formatMinute(row.endMinute)}</span>
                </div>

                <div className={styles.rowWho}>
                  <p className={styles.name}>
                    {row.name}
                    <span className={styles.party}>{row.partySize} P.</span>
                  </p>
                  <p className={styles.contact}>
                    {row.phone ? <a href={`tel:${row.phone.replace(/[^+\d]/g, '')}`}>{row.phone}</a> : '—'}
                    {row.email ? <> · {row.email}</> : null}
                  </p>
                  {row.note ? <p className={styles.note}>„{row.note}“</p> : null}
                  {row.staffNote ? <p className={styles.staffNote}>{row.staffNote}</p> : null}
                </div>

                <div className={styles.rowMeta}>
                  <span className={styles.channel} data-channel={row.channel}>
                    {CHANNEL_LABEL[row.channel]}
                  </span>
                  <span className={styles.reference}>{row.reference}</span>
                  {row.conflict ? <span className={styles.conflictFlag}>kein Tisch frei</span> : null}
                </div>

                <BookRowActions
                  locale={locale}
                  dict={dict}
                  date={date}
                  id={row.id}
                  status={row.status}
                  tableId={row.tableId}
                  tables={book.tables}
                  staffNote={row.staffNote}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
