import Link from 'next/link';
import { PageHead } from './PageHead';
import styles from './OrderView.module.css';
import viewStyles from './Views.module.css';
import { getFlags, orderingPossible } from '@/server/settings';
import { readCart } from '@/server/cart';
import { OPERATING_HOURS, RESTAURANT, phoneHref } from '@/lib/restaurant';
import { formatMinute } from '@/lib/dates';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * The way in to takeaway.
 *
 * Collection and delivery are separate switches, and each says plainly whether
 * it is on. Delivery is off: no delivery area, fee or minimum has been
 * confirmed, and inventing those is how a guest ends up waiting for food that
 * was never going to arrive.
 */
export async function OrderView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [flags, cart] = await Promise.all([getFlags(), readCart(locale)]);

  return (
    <>
      <PageHead label={dict.nav.order} title={dict.order.title} text={dict.order.choose} />

      <div className={`section ${viewStyles.plain}`}>
        <div className="shell">
          <div className={styles.options}>
            <article className={styles.option} data-on={flags.pickupEnabled}>
              <h2 className={styles.optionTitle}>{dict.order.pickup}</h2>
              <p className={styles.optionText}>{dict.order.pickupText}</p>
              <p className={styles.optionMeta}>
                {formatMinute(OPERATING_HOURS.kitchen.opensMinute)} – {formatMinute(OPERATING_HOURS.kitchen.closesMinute)}
                {' · '}
                {RESTAURANT.street}
              </p>

              {flags.pickupEnabled ? (
                <Link href={hrefFor(locale, cart.lines.length ? 'cart' : 'menu')} className="btn btn--gold">
                  {cart.lines.length ? dict.cart.checkout : dict.cart.emptyCta}
                </Link>
              ) : (
                <p className={styles.off}>{dict.order.pickupOff}</p>
              )}
            </article>

            <article className={styles.option} data-on={flags.deliveryEnabled}>
              <h2 className={styles.optionTitle}>{dict.order.delivery}</h2>
              <p className={styles.optionText}>{dict.order.deliveryText}</p>

              {flags.deliveryEnabled ? (
                <Link href={hrefFor(locale, 'cart')} className="btn btn--gold">
                  {dict.cart.checkout}
                </Link>
              ) : (
                <p className={styles.off}>{dict.order.deliveryOff}</p>
              )}
            </article>
          </div>

          {!orderingPossible(flags) ? (
            <p className={viewStyles.empty} style={{ marginTop: '2rem' }}>
              {dict.order.closed}{' '}
              <a href={phoneHref(RESTAURANT.phone)} className="linkArrow">
                {RESTAURANT.phone}
              </a>
            </p>
          ) : null}

          <p className={styles.hoursNote}>{dict.contact.hoursPending}</p>
        </div>
      </div>
    </>
  );
}
