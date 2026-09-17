import Link from 'next/link';
import styles from './Admin.module.css';
import { OrderRowActions } from './OrderRowActions';
import { orderBook, takingsFor } from '@/server/admin-orders';
import { formatMoney } from '@/lib/money';
import { addDays, formatDate } from '@/lib/dates';
import { hrefFor, type Locale } from '@/lib/i18n';

/**
 * The day's collection orders, in the order the kitchen will cook them.
 *
 * Sorted by slot, not by when the order arrived: what the kitchen needs at four
 * o'clock is the list of what leaves at five, and an order placed yesterday for
 * tonight belongs in tonight's list.
 *
 * Cancelled and rejected rows stay on the screen, greyed. The question this
 * screen is usually asked is "what happened to order XG-4821", and a row that
 * has been filtered away cannot answer it.
 */
export async function AdminOrders({ locale, date }: { locale: Locale; date: string }) {
  const [rows, takings] = await Promise.all([orderBook(date), takingsFor(date)]);
  const base = `${hrefFor(locale, 'admin')}/bestellungen`;

  return (
    <div className={styles.page}>
      <header className={styles.dayBar}>
        <Link href={`${base}?date=${addDays(date, -1)}`} className={styles.dayStep}>
          ←
        </Link>
        <span className={styles.dayName}>{formatDate(date, 'de')}</span>
        <Link href={`${base}?date=${addDays(date, 1)}`} className={styles.dayStep}>
          →
        </Link>

        <span className={styles.spacer} />

        <span className={styles.tally}>
          {takings.openCount} offen
          <b>{formatMoney(takings.paidCents, 'de')}</b>
          bezahlt · {takings.paidCount} Bestellungen
        </span>
      </header>

      {takings.unpaidCount > 0 ? (
        <p className={styles.warn}>
          {takings.unpaidCount} Bestellung(en) über {formatMoney(takings.unpaidCents, 'de')} warten auf
          Zahlung. Es ist kein Zahlungsanbieter angebunden — bitte unter „Zahlungen“ prüfen.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className={styles.empty}>Für diesen Tag liegen keine Bestellungen vor.</p>
      ) : (
        <ul className={styles.orders}>
          {rows.map((row) => (
            <li key={row.id} className={styles.order} data-state={row.status}>
              <div className={styles.orderHead}>
                <span className={styles.slot}>{row.slotLabel}</span>
                <span className={styles.reference}>{row.reference}</span>
                <span className={styles.who}>
                  {row.name}
                  <a href={`tel:${row.phone.replace(/[^+\d]/g, '')}`}>{row.phone}</a>
                </span>
                <span className={styles.spacer} />
                <span className={styles.money}>{formatMoney(row.totalCents, 'de')}</span>
                <PaymentBadge row={row} />
              </div>

              <ul className={styles.lines}>
                {row.lines.map((line, index) => (
                  <li key={index}>
                    <b>{line.quantity} ×</b> {line.name}
                    {line.variantLabel ? <span className={styles.variant}>{line.variantLabel}</span> : null}
                    <span className={styles.spacer} />
                    {formatMoney(line.totalCents, 'de')}
                    {line.note ? <em className={styles.lineNote}>{line.note}</em> : null}
                  </li>
                ))}
              </ul>

              <OrderRowActions id={row.id} status={row.status} date={date} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Whether money has arrived, kept apart from whether the food is ready.
 *
 * An order can be cooked and unpaid, or paid and cancelled. One badge that
 * tried to say both would have to lie about one of them.
 */
function PaymentBadge({ row }: { row: { paidAt: Date | null; paymentProvider: string | null } }) {
  if (row.paidAt) {
    return <span className={styles.paid}>bezahlt{row.paymentProvider ? ` · ${row.paymentProvider}` : ''}</span>;
  }
  return (
    <span className={styles.unpaid}>
      offen{row.paymentProvider ? ` · ${row.paymentProvider}` : ' · bei Abholung'}
    </span>
  );
}
