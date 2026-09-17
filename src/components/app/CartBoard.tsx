'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './CartBoard.module.css';
import { EdgeLight } from './EdgeLight';
import { setCartNoteAction, setQuantityAction } from '@/server/actions';
import { fill, type Dictionary } from '@/lib/dictionary';
import { formatMoney } from '@/lib/money';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Cart } from '@/server/cart';
import type { Slot } from '@/server/orders';

/**
 * Bestellen — the basket.
 *
 * This is the screen the drawing shows under the Bestellen tab, so the tab
 * opens on it: the lines on the left, and one nested card on the right holding
 * the way of collecting, the hour, the total and the way out to the checkout.
 * The version before this one was two picture cards explaining that takeaway
 * exists, which is a page a guest reads once and never again.
 *
 * The steppers are plain forms posting to a server action. They work with
 * JavaScript switched off, and — more to the point — a quantity is a price, so
 * it is the server that changes it and the server that prices it again.
 */
export function CartBoard({
  locale,
  dict,
  cart,
  slots,
  pickupEnabled,
  deliveryEnabled,
  canOrder,
  demoMode,
  priceNote,
}: {
  locale: Locale;
  dict: Dictionary;
  cart: Cart;
  slots: Slot[];
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  canOrder: boolean;
  demoMode: boolean;
  priceNote: string;
}) {
  const free = slots.filter((slot) => !slot.full);

  const [fulfilment, setFulfilment] = useState<'pickup' | 'delivery'>(
    pickupEnabled || !deliveryEnabled ? 'pickup' : 'delivery',
  );
  const [minute, setMinute] = useState<number | ''>('');

  const blocked = cart.problems.some((problem) => problem.kind !== 'price_changed');
  const changed = cart.problems.some((problem) => problem.kind === 'price_changed');

  /*
   * The hour travels to the checkout in the link rather than in a store: the
   * two screens are separate documents, and a guest who opens the checkout in
   * a new tab should still arrive with the time they picked.
   */
  const checkoutHref =
    minute === '' ? hrefFor(locale, 'checkout') : `${hrefFor(locale, 'checkout')}?zeit=${minute}`;

  return (
    <div className={`glass ${styles.board}`}>
      <EdgeLight />

      <div className={styles.columns}>
        {/* ---------------------------------------------------------- lines -- */}
        <div className={styles.left}>
          <header className={styles.head}>
            <h1 className={styles.title}>{dict.cart.heading}</h1>
            <p className={styles.subtitle}>
              {demoMode ? dict.cart.sample : fill(dict.cart.items, { n: cart.itemCount })}
            </p>
          </header>

          {cart.lines.length ? (
            <ul className={styles.lines}>
              {cart.lines.map((line) => (
                <li key={line.id} className={styles.line}>
                  <Link
                    href={hrefFor(locale, 'dish', { slug: line.slug })}
                    className={styles.thumb}
                    aria-hidden={line.photoId ? undefined : true}
                    tabIndex={line.photoId ? undefined : -1}
                  >
                    {line.photoId ? (
                      <img
                        src={`/img/dish/${line.photoId}-480.webp`}
                        alt=""
                        width={104}
                        height={104}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </Link>

                  <div className={styles.body}>
                    <Link href={hrefFor(locale, 'dish', { slug: line.slug })} className={styles.name}>
                      {line.name}
                    </Link>

                    {/* What the dish is, then how it was chosen — the variant
                        only when it says something ("groß", "mit Ente"). */}
                    {line.detail ? <p className={styles.detail}>{line.detail}</p> : null}
                    {line.variantLabel ? <p className={styles.variant}>{line.variantLabel}</p> : null}
                    {line.note ? <p className={styles.lineNote}>„{line.note}“</p> : null}

                    <p className={styles.unit}>
                      {formatMoney(line.unitPriceCents, locale)}
                      <span>{dict.cart.perPortion}</span>
                    </p>

                    {line.soldOut ? (
                      <p className={styles.warn}>{fill(dict.cart.soldOut, { name: line.name })}</p>
                    ) : !line.orderable ? (
                      <p className={styles.warn}>{dict.menu.dineInOnly}</p>
                    ) : null}
                    {line.priceChanged ? <p className={styles.warn}>{dict.cart.priceChanged}</p> : null}
                  </div>

                  <div className={styles.stepper}>
                    <Quantity
                      locale={locale}
                      lineId={line.id}
                      quantity={line.quantity - 1}
                      label={dict.dish.less}
                      glyph="−"
                    />
                    <span className={styles.count}>{line.quantity}</span>
                    <Quantity
                      locale={locale}
                      lineId={line.id}
                      quantity={line.quantity + 1}
                      label={dict.dish.more}
                      glyph="+"
                    />
                  </div>

                  <p className={styles.lineTotal}>{formatMoney(line.totalCents, locale)}</p>

                  <form action={setQuantityAction} className={styles.removeForm}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="lineId" value={line.id} />
                    <input type="hidden" name="quantity" value={0} />
                    <button type="submit" className={styles.remove} aria-label={dict.cart.remove}>
                      <BinIcon />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.empty}>
              <p>{dict.cart.empty}</p>
              <Link href={hrefFor(locale, 'menu')} className="cta">
                {dict.cart.emptyCta}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}

          {cart.lines.length ? <Wishes dict={dict} initial={cart.note ?? ''} /> : null}

          <Link href={hrefFor(locale, 'menu')} className={styles.back}>
            <span aria-hidden="true">←</span>
            {dict.cart.keepShopping}
          </Link>
        </div>

        {/* -------------------------------------------------------- summary -- */}
        <aside className={styles.summary}>
          <div className={styles.ways}>
            <button
              type="button"
              className={styles.way}
              data-on={fulfilment === 'pickup' || undefined}
              data-off={pickupEnabled ? undefined : 'true'}
              aria-pressed={fulfilment === 'pickup'}
              disabled={!pickupEnabled}
              onClick={() => setFulfilment('pickup')}
            >
              <CarIcon />
              <span className={styles.wayText}>
                <b>{dict.order.pickup}</b>
                <small>{pickupEnabled ? dict.cart.pickupHere : dict.cart.comingSoon}</small>
              </span>
            </button>

            {/*
             * Delivery is drawn, and drawn as unavailable. No area, fee or
             * minimum has been confirmed, so the button that would promise one
             * says plainly that it is not ready rather than hiding.
             */}
            <button
              type="button"
              className={styles.way}
              data-on={fulfilment === 'delivery' || undefined}
              data-off={deliveryEnabled ? undefined : 'true'}
              aria-pressed={fulfilment === 'delivery'}
              disabled={!deliveryEnabled}
              onClick={() => setFulfilment('delivery')}
            >
              <ScooterIcon />
              <span className={styles.wayText}>
                <b>{dict.order.delivery}</b>
                <small>{deliveryEnabled ? dict.order.deliveryText : dict.cart.comingSoon}</small>
              </span>
            </button>
          </div>

          {/* An hour is only worth asking for once there is something to
              collect; on an empty basket the row would be a warning about
              nothing. */}
          {cart.lines.length ? (
          <label className={styles.time}>
            <span className={styles.timeLabel}>{dict.cart.pickupTime}</span>
            {free.length ? (
              <span className={styles.timeControl}>
                <ClockIcon />
                <select value={minute} onChange={(event) => setMinute(Number(event.target.value))}>
                  <option value="">{dict.cart.chooseTime}</option>
                  {free.map((slot) => (
                    <option key={slot.minute} value={slot.minute}>
                      {slot.label}
                    </option>
                  ))}
                </select>
                <ChevronIcon />
              </span>
            ) : (
              <span className={styles.timeNone}>{dict.checkout.noSlots}</span>
            )}
          </label>
          ) : null}

          <div className={styles.sums}>
            <p className={styles.sumRow}>
              <span>{dict.cart.subtotal}</span>
              <span>{formatMoney(cart.subtotalCents, locale)}</span>
            </p>
            <p className={styles.grand}>
              <span>{dict.cart.total}</span>
              <span>{formatMoney(cart.subtotalCents, locale)}</span>
            </p>
            <p className={styles.tax}>{dict.cart.taxIncluded}</p>
          </div>

          {changed ? <p className={styles.warn}>{dict.cart.priceChanged}</p> : null}

          {canOrder ? (
            <Link
              href={checkoutHref}
              className={`cta ${styles.checkout}`}
              aria-disabled={!cart.lines.length || blocked || undefined}
              tabIndex={!cart.lines.length || blocked ? -1 : undefined}
            >
              {dict.cart.checkout}
              <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <p className={styles.closed}>{dict.order.closed}</p>
          )}

          {/*
           * Wordmarks, not the providers' artwork — the same rule as the
           * checkout screen: none of these companies has been signed up, and a
           * traced logo would claim a relationship this site does not have.
           */}
          <p className={styles.marks} aria-label={dict.checkout.payMethod}>
            <span className={styles.mark} data-tone="paypal">
              PayPal
            </span>
            <span className={styles.mark} data-tone="visa">
              VISA
            </span>
            <span className={styles.mark} data-tone="mastercard">
              <span className={styles.mcRings} aria-hidden="true" />
              mastercard
            </span>
          </p>

          <p className={styles.fine}>{priceNote}</p>
        </aside>
      </div>
    </div>
  );
}

/** One half of a stepper: its own form, so it works without JavaScript. */
function Quantity({
  locale,
  lineId,
  quantity,
  label,
  glyph,
}: {
  locale: Locale;
  lineId: number;
  quantity: number;
  label: string;
  glyph: string;
}) {
  return (
    <form action={setQuantityAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="lineId" value={lineId} />
      <input type="hidden" name="quantity" value={quantity} />
      <button type="submit" className={styles.step} aria-label={label}>
        {glyph}
      </button>
    </form>
  );
}

/**
 * "Wünsche zur Bestellung".
 *
 * Saved a second after the guest stops typing, because a field that only saves
 * on submit loses an allergy to a reload — and one that saves on every
 * keystroke writes to the database thirty times a sentence. The word beside
 * the label says when it has landed, so nobody has to wonder.
 */
function Wishes({ dict, initial }: { dict: Dictionary; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    /*
     * Nothing to save until the guest has changed something. Compared against
     * the value that came from the server rather than guarded by a "first run"
     * flag: in development React mounts effects twice, and the flag let the
     * second run through — which wrote the note back unchanged and lit
     * "Gespeichert" on a field nobody had touched.
     */
    if (value === initial) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      void setCartNoteAction(value).then(() => setSaved(true));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [value, initial]);

  return (
    <div className={styles.wishes}>
      <label className={styles.wishesLabel} htmlFor="cart-note">
        {dict.cart.wishes}
        {saved ? <span className={styles.wishesSaved}>{dict.cart.wishesSaved}</span> : null}
      </label>
      <input
        id="cart-note"
        className={styles.wishesInput}
        value={value}
        maxLength={300}
        placeholder={dict.cart.wishesPlaceholder}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}

const line = {
  stroke: 'currentColor',
  fill: 'none',
  strokeWidth: 1.3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Collection: the car pulling up outside. */
function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M3.4 14.6h17.2v3.2a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1v-.6H6.8v.6a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1Z" {...line} />
      <path d="M5 14.6 6.6 9a2 2 0 0 1 1.9-1.4h7a2 2 0 0 1 1.9 1.4L19 14.6" {...line} />
      <path d="M6.6 16.4h1.6M15.8 16.4h1.6" {...line} strokeWidth={1} />
    </svg>
  );
}

function ScooterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="6" cy="17.2" r="2.8" {...line} />
      <circle cx="18.4" cy="17.2" r="2.8" {...line} />
      <path d="M8.8 17.2h6.8" {...line} />
      <path d="m15.6 17.2-2-7h-2.4" {...line} />
      <path d="M13.6 10.2h4a2 2 0 0 1 2 2v5" {...line} />
      <rect x="15" y="4.6" width="6" height="4.4" rx="0.9" {...line} strokeWidth={1} />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" {...line} />
      <path d="M12 7.6V12l3 1.8" {...line} />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="m7 10 5 5 5-5" {...line} />
    </svg>
  );
}

function BinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path d="M4.6 6.6h14.8" {...line} />
      <path d="M9.4 6.6V5.2a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4v1.4" {...line} />
      <path d="M6.4 6.6 7.3 19a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.9-12.4" {...line} />
      <path d="M10.2 10.2v6.4M13.8 10.2v6.4" {...line} strokeWidth={1} />
    </svg>
  );
}
