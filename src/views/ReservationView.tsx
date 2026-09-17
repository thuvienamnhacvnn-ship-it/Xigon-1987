import Link from 'next/link';
import { PageHead } from './PageHead';
import styles from './StatusView.module.css';
import viewStyles from './Views.module.css';
import { CancelReservation } from '@/components/CancelReservation';
import { getReservationByToken } from '@/server/reservations';
import { formatDate, formatMinute } from '@/lib/dates';
import { fill, type Dictionary } from '@/lib/dictionary';
import { hrefFor, type Locale } from '@/lib/i18n';
import { RESTAURANT, phoneHref } from '@/lib/restaurant';

/**
 * A guest's own reservation.
 *
 * The token in the link is the only credential, so the page is kept out of
 * search indexes and shows nothing that would identify anyone else.
 */
export async function ReservationView({
  locale,
  dict,
  token,
}: {
  locale: Locale;
  dict: Dictionary;
  token: string;
}) {
  const reservation = await getReservationByToken(token);

  if (!reservation) {
    return (
      <>
        <PageHead label={dict.nav.reserve} title={dict.reservation.title} />
        <div className={`section ${viewStyles.plain}`}>
          <div className="shell">
            <p className={viewStyles.empty}>{dict.reservation.notFound}</p>
          </div>
        </div>
      </>
    );
  }

  const status = dict.reservation.statuses[reservation.status] ?? reservation.status;
  const live = ['requested', 'confirmed'].includes(reservation.status);

  return (
    <>
      <PageHead
        label={dict.nav.reserve}
        title={reservation.status === 'confirmed' ? dict.reserve.okConfirmed : dict.reserve.okRequested}
        text={reservation.status === 'confirmed' ? dict.reserve.okConfirmedText : dict.reserve.okRequestedText}
      />

      <div className={`section ${viewStyles.plain}`}>
        <div className="shell">
          <div className={styles.card}>
            <div className={styles.headRow}>
              <div>
                <p className="label">{dict.reservation.reference}</p>
                <p className={styles.reference}>{reservation.reference}</p>
              </div>
              <p className={styles.status} data-status={reservation.status}>
                {status}
              </p>
            </div>

            <dl className={styles.facts}>
              <div>
                <dt>{dict.reservation.when}</dt>
                <dd>{formatDate(reservation.date, locale)}</dd>
              </div>
              <div>
                <dt>{dict.reserve.steps.time}</dt>
                <dd>{formatMinute(reservation.startMinute)}</dd>
              </div>
              <div>
                <dt>{dict.reservation.party}</dt>
                <dd>
                  {reservation.partySize === 1
                    ? dict.reserve.guestsOne
                    : fill(dict.reserve.guestsMany, { n: reservation.partySize })}
                </dd>
              </div>
            </dl>

            <section className={styles.block}>
              <h2 className={styles.blockTitle}>{dict.checkout.contact}</h2>
              <p>{reservation.name}</p>
              <p className={styles.hint}>
                {reservation.email} · {reservation.phone}
              </p>
              {reservation.occasion ? <p className={styles.hint}>{reservation.occasion}</p> : null}
              {reservation.note ? <p className={styles.hint}>„{reservation.note}“</p> : null}
            </section>

            <p className={styles.hint}>{dict.reserve.manageHint}</p>

            <div className={styles.footRow}>
              {live ? <CancelReservation locale={locale} dict={dict} token={reservation.token} /> : null}

              <a href={phoneHref(RESTAURANT.phone)} className="btn btn--sm">
                {dict.contact.call} {RESTAURANT.phone}
              </a>
              <Link href={hrefFor(locale, 'menu')} className="linkArrow">
                {dict.nav.menu}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
