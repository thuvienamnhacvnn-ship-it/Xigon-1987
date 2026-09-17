import Link from 'next/link';
import { PageHead } from './PageHead';
import styles from './StatusView.module.css';
import viewStyles from './Views.module.css';
import { getOrderByToken } from '@/server/orders';
import { formatMinute, formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { fill, type Dictionary } from '@/lib/dictionary';
import { hrefFor, type Locale } from '@/lib/i18n';
import { RESTAURANT, phoneHref } from '@/lib/restaurant';

/**
 * What happened to an order.
 *
 * Reached only through the long random token in the confirmation link, and the
 * page is excluded from search indexes — the address is the only credential, so
 * it must not leak anywhere it can be found.
 */
export async function OrderStatusView({
  locale,
  dict,
  token,
}: {
  locale: Locale;
  dict: Dictionary;
  token: string;
}) {
  const found = await getOrderByToken(token);

  if (!found) {
    return (
      <>
        <PageHead label={dict.nav.order} title={dict.orderStatus.title} />
        <div className={`section ${viewStyles.plain}`}>
          <div className="shell">
            <p className={viewStyles.empty}>{dict.orderStatus.notFound}</p>
          </div>
        </div>
      </>
    );
  }

  const { order, items } = found;
  const status = dict.orderStatus.statuses[order.status] ?? order.status;

  return (
    <>
      <PageHead label={dict.nav.order} title={dict.orderStatus.title} />

      <div className={`section ${viewStyles.plain}`}>
        <div className="shell">
          <div className={styles.card}>
            <div className={styles.headRow}>
              <div>
                <p className="label">{dict.orderStatus.reference}</p>
                <p className={styles.reference}>{order.reference}</p>
              </div>
              <p className={styles.status} data-status={order.status}>
                {status}
              </p>
            </div>

            <dl className={styles.facts}>
              <div>
                <dt>{dict.orderStatus.placedAt}</dt>
                <dd>{formatDate(order.slotDate, locale)}</dd>
              </div>
              <div>
                <dt>{dict.orderStatus.promised}</dt>
                <dd>{formatMinute(order.slotMinute)}</dd>
              </div>
              <div>
                <dt>{order.fulfilment === 'pickup' ? dict.order.pickup : dict.order.delivery}</dt>
                <dd>
                  {order.fulfilment === 'pickup'
                    ? `${RESTAURANT.street}, ${RESTAURANT.postalCode} ${RESTAURANT.city}`
                    : [order.street, order.postalCode, order.city].filter(Boolean).join(', ')}
                </dd>
              </div>
            </dl>

            <section className={styles.block}>
              <h2 className={styles.blockTitle}>{dict.orderStatus.items}</h2>
              <ul className={styles.items}>
                {items.map((item) => (
                  <li key={item.id}>
                    <span className={styles.qty}>{item.quantity}×</span>
                    <span>
                      {item.nameSnapshot}
                      {item.variantSnapshot ? <span className={styles.variant}>{item.variantSnapshot}</span> : null}
                      {item.note ? <span className={styles.note}>„{item.note}“</span> : null}
                    </span>
                    <span className={styles.price}>{formatMoney(item.totalCents, locale)}</span>
                  </li>
                ))}
              </ul>

              <dl className={styles.totals}>
                <div className={styles.totalsMuted}>
                  <dt>{fill(dict.cart.tax, { rate: RESTAURANT.taxRateBasisPoints / 100 })}</dt>
                  <dd>{formatMoney(order.taxCents, locale)}</dd>
                </div>
                <div className={styles.grand}>
                  <dt>{dict.cart.total}</dt>
                  <dd>{formatMoney(order.totalCents, locale)}</dd>
                </div>
              </dl>
            </section>

            {order.status === 'rejected' ? <p className={styles.warn}>{dict.orderStatus.rejectedNote}</p> : null}

            <div className={styles.footRow}>
              <a href={phoneHref(RESTAURANT.phone)} className="btn btn--sm">
                {dict.contact.call} {RESTAURANT.phone}
              </a>
              <Link href={hrefFor(locale, 'menu')} className="linkArrow">
                {dict.cart.emptyCta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
