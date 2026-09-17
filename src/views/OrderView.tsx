import Link from 'next/link';
import styles from './OrderView.module.css';
import { EdgeLight } from '@/components/app/EdgeLight';
import { Ornament } from '@/components/app/Ornament';
import { getFlags } from '@/server/settings';
import { readCart } from '@/server/cart';
import { OPERATING_HOURS, RESTAURANT, phoneHref } from '@/lib/restaurant';
import { formatMinute } from '@/lib/dates';
import { PRICE_NOTE } from '@/lib/price-note';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * Bestellen — the way in to takeaway.
 *
 * Collection and delivery are separate switches and each says plainly whether
 * it is on. Delivery is off: no delivery area, fee or minimum has been
 * confirmed, and inventing those is how a guest ends up waiting for food that
 * was never going to arrive. So it is drawn, and drawn as unavailable, rather
 * than hidden — a guest who wants delivery deserves to be told, not left to
 * wonder whether they missed the button.
 */
export async function OrderView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [flags, cart] = await Promise.all([getFlags(), readCart(locale)]);
  const waiting = cart.lines.length;

  return (
    <div className={styles.screen}>
      <Ornament kind="corner" className={styles.cornerTop} />
      <Ornament kind="branch" className={styles.branch} />

      <header className={styles.head}>
        <p className="label">{dict.nav.order}</p>
        <h1 className={styles.title}>{dict.order.title}</h1>
        <p className={styles.lede}>{dict.order.choose}</p>
        <Ornament kind="rule" className={styles.headRule} />
      </header>

      <div className={styles.options}>
        {/* ---------- collection ---------- */}
        <article className={`glass ${styles.option}`} data-on={flags.pickupEnabled ? 'true' : undefined}>
          <EdgeLight />
          <span className={styles.mark}>
            <BagIcon />
          </span>

          <h2 className={styles.optionTitle}>{dict.order.pickup}</h2>
          <p className={styles.optionText}>{dict.order.pickupText}</p>

          <ul className={styles.facts}>
            <li>
              <ClockIcon />
              {formatMinute(OPERATING_HOURS.kitchen.opensMinute)} – {formatMinute(OPERATING_HOURS.kitchen.closesMinute)}
            </li>
            <li>
              <PinIcon />
              {RESTAURANT.street}
            </li>
          </ul>

          {flags.pickupEnabled ? (
            <Link href={hrefFor(locale, waiting ? 'cart' : 'menu')} className={`cta ${styles.action}`}>
              {waiting ? dict.cart.checkout : dict.cart.emptyCta}
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <p className={styles.off}>{dict.order.pickupOff}</p>
          )}
        </article>

        {/* ---------- delivery ---------- */}
        <article className={`glass ${styles.option}`} data-on={flags.deliveryEnabled ? 'true' : undefined}>
          <EdgeLight />
          <span className={styles.mark}>
            <ScooterIcon />
          </span>

          <h2 className={styles.optionTitle}>{dict.order.delivery}</h2>
          <p className={styles.optionText}>{dict.order.deliveryText}</p>

          {flags.deliveryEnabled ? (
            <Link href={hrefFor(locale, waiting ? 'cart' : 'menu')} className={`cta ${styles.action}`}>
              {waiting ? dict.cart.checkout : dict.cart.emptyCta}
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <>
              <p className={styles.off}>{dict.order.deliveryOff}</p>
              {/* The way round it, since there is one: the telephone. */}
              <a href={phoneHref(RESTAURANT.phone)} className={`ghost ${styles.action}`}>
                <PhoneIcon />
                {RESTAURANT.phone}
              </a>
            </>
          )}
        </article>
      </div>

      <p className={styles.note}>{PRICE_NOTE[locale]}</p>
    </div>
  );
}

const line = {
  stroke: 'currentColor',
  fill: 'none',
  strokeWidth: 1.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Collection: a bag with a handle, carried out of the door. */
function BagIcon() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
      <path d="M11 15h26l-2.4 26.5a3 3 0 0 1-3 2.5H16.4a3 3 0 0 1-3-2.5L11 15Z" {...line} />
      <path d="M18 15a6 6 0 0 1 12 0" {...line} />
      <path d="M17.5 23.5h13" {...line} strokeWidth={0.8} />
      <circle cx="24" cy="31" r="3.2" {...line} strokeWidth={0.8} />
    </svg>
  );
}

/** Delivery: a scooter with a box on the back. */
function ScooterIcon() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
      <circle cx="12" cy="34" r="6" {...line} />
      <circle cx="37" cy="34" r="6" {...line} />
      <path d="M18 34h13" {...line} />
      <path d="m31 34-4-14h-5" {...line} />
      <path d="M27 20h8a4 4 0 0 1 4 4v10" {...line} />
      <rect x="30" y="9" width="12" height="9" rx="1.6" {...line} strokeWidth={0.9} />
      <path d="M33 13.5h6" {...line} strokeWidth={0.8} />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" {...line} />
      <path d="M12 7.2V12l3.2 2" {...line} />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" {...line} />
      <circle cx="12" cy="10" r="2.6" {...line} />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M6.4 3.6h3.1l1.5 3.9-2.2 1.4a11.4 11.4 0 0 0 5.3 5.3l1.4-2.2 3.9 1.5v3.1a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.4 5.8a2 2 0 0 1 2-2.2Z"
        {...line}
      />
    </svg>
  );
}
