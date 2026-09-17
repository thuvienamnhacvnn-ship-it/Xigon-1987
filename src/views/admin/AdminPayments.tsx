import styles from './Admin.module.css';
import { markOrderPaidAction } from '@/server/admin-actions';
import { unpaidOrders } from '@/server/admin-orders';
import { RESTAURANT } from '@/lib/restaurant';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/dates';
import type { Locale } from '@/lib/i18n';

/**
 * Payments — or rather, the absence of them.
 *
 * No payment provider is connected. Nothing in this system has ever taken
 * money, and this screen does not pretend otherwise: what it offers is a way
 * for a person at the counter to write down that money arrived, and who to ask
 * if the figure is ever questioned.
 *
 * An order that chose PayPal or a card therefore stops at "awaiting payment",
 * counts against the kitchen's capacity for half an hour, and is then released
 * automatically. This list is what is still inside that half hour. It is
 * normally empty, and when it is not, somebody has to decide: it was settled at
 * the door, or it was never really an order.
 */
export async function AdminPayments({ locale }: { locale: Locale }) {
  const rows = await unpaidOrders();

  return (
    <div className={styles.page}>
      <p className={styles.warn}>
        Es ist kein Zahlungsanbieter angebunden. Über diese Seite wird keine Zahlung ausgelöst — sie hält nur
        fest, dass Geld eingegangen ist. Unbezahlte Bestellungen geben ihren Zeitraum nach{' '}
        {RESTAURANT.orderPaymentWindowMinutes} Minuten von selbst wieder frei.
      </p>

      {rows.length === 0 ? (
        <p className={styles.empty}>Zurzeit wartet keine Bestellung auf eine Zahlung.</p>
      ) : (
        <ul className={styles.orders}>
          {rows.map((row) => (
            <li key={row.id} className={styles.order}>
              <div className={styles.orderHead}>
                <span className={styles.reference}>{row.reference}</span>
                <span className={styles.who}>
                  {row.name}
                  <a href={`tel:${row.phone.replace(/[^+\d]/g, '')}`}>{row.phone}</a>
                </span>
                <span className={styles.spacer} />
                <span className={styles.money}>{formatMoney(row.totalCents, 'de')}</span>
                <span className={styles.unpaid}>{row.paymentProvider ?? 'ohne Angabe'}</span>
              </div>

              <p className={styles.meta}>
                Abholung {formatDate(row.slotDate, 'de')} um {row.slotLabel} · bestellt{' '}
                {row.createdAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </p>

              {/*
               * A reference field, not a free note. Whoever records a payment
               * should leave behind the thing that can be looked up later — a
               * till receipt number, a transaction id — because in six weeks
               * "bezahlt" on its own settles no argument.
               */}
              <form action={markOrderPaidAction} className={styles.payForm}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="date" value={row.slotDate} />
                <input type="hidden" name="locale" value={locale} />
                <label>
                  Beleg- oder Transaktionsnummer
                  <input name="reference" maxLength={120} autoComplete="off" spellCheck={false} />
                </label>
                <button type="submit" className={styles.actionStrong}>
                  Zahlung eingegangen
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
