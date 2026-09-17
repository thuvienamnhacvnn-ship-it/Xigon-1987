'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './CheckoutBoard.module.css';
import { placeOrderAction, slotsAction } from '@/server/actions';
import { formatDate } from '@/lib/dates';
import { fill, type Dictionary } from '@/lib/dictionary';
import { formatMoney } from '@/lib/money';
import { hrefFor, type Locale } from '@/lib/i18n';
import { RESTAURANT } from '@/lib/restaurant';
import type { Cart } from '@/server/cart';
import type { PaymentMethod, Slot } from '@/server/orders';

/** What the browser told us about a wallet, once it has been asked. */
type WalletState = 'checking' | 'available' | 'unavailable';

/**
 * Checkout.
 *
 * Two things this screen must not do, and the drawing tempts it towards both.
 *
 * It must not send a price. The lines and the total below are the ones the
 * server already priced; `placeOrderAction` prices the basket again from the
 * live menu before it writes anything, so what a guest reads and what is
 * recorded come out of the same code and cannot drift.
 *
 * And it must not suggest that money moved. No payment provider is connected.
 * The four rows are a choice the order carries — PayPal, card and wallet leave
 * the order waiting for a payment nobody can take yet, paying on collection
 * completes it at the counter — and the notice under the button says so in
 * plain words rather than leaving the gold button to imply otherwise.
 */
export function CheckoutBoard({
  locale,
  dict,
  cart,
  today,
  initialSlots,
  preferredMinute,
  pickupEnabled,
  deliveryEnabled,
  demoMode,
  priceNote,
}: {
  locale: Locale;
  dict: Dictionary;
  cart: Cart;
  today: string;
  initialSlots: Slot[];
  /** The hour picked on the basket screen, when it is still free. */
  preferredMinute?: number | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  demoMode: boolean;
  priceNote: string;
}) {
  /*
   * A plain flag, not `useTransition`. React 19 leaves a transition's
   * `isPending` stuck true once an awaited server action runs inside it, which
   * disables every control on the screen for good — this project has paid for
   * that once already.
   */
  const [busy, setBusy] = useState(false);

  const [fulfilment, setFulfilment] = useState<'pickup' | 'delivery'>(pickupEnabled ? 'pickup' : 'delivery');
  const [method, setMethod] = useState<PaymentMethod>('paypal');
  const [wallet, setWallet] = useState<WalletState>('checking');
  const [accepted, setAccepted] = useState(false);

  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [slotMinute, setSlotMinute] = useState<number | null>(
    preferredMinute ?? initialSlots.find((slot) => !slot.full)?.minute ?? null,
  );

  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    postalCode: '',
    city: RESTAURANT.city,
  });

  /* Minted once a visit: a double-click or a browser retry lands on one order. */
  const idempotencyKey = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
  );

  /*
   * Ask the browser before offering a wallet.
   *
   * A wallet button that does nothing is worse than no wallet button, and on a
   * desktop without Apple Pay or a payment handler that is exactly what this
   * row would be. It runs after mount because the server has no way to know,
   * and rendering an enabled row first would flicker it off again.
   */
  useEffect(() => {
    const hasApplePay = 'ApplePaySession' in window;
    const hasPaymentRequest = typeof window.PaymentRequest === 'function';
    setWallet(hasApplePay || hasPaymentRequest ? 'available' : 'unavailable');
  }, []);

  /* A method the browser cannot honour must not stay selected behind a disabled row. */
  useEffect(() => {
    if (wallet === 'unavailable') setMethod((current) => (current === 'wallet' ? 'paypal' : current));
  }, [wallet]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldError(null);

    if (!accepted) {
      setError(dict.checkout.mustAccept);
      return;
    }
    if (slotMinute === null) {
      setError(dict.checkout.noSlots);
      return;
    }

    setBusy(true);
    void place(slotMinute);
  }

  async function place(minute: number) {
    const result = await placeOrderAction({
      locale,
      fulfilment,
      paymentMethod: method,
      name: form.name,
      email: form.email,
      phone: form.phone,
      street: fulfilment === 'delivery' ? form.street : null,
      postalCode: fulfilment === 'delivery' ? form.postalCode : null,
      city: fulfilment === 'delivery' ? form.city : null,
      addressNote: null,
      slotDate: today,
      slotMinute: minute,
      idempotencyKey: idempotencyKey.current,
    });

    /*
     * There is no success branch. A recorded order redirects from the server to
     * its own page, so anything that arrives here is a refusal.
     */
    if (result.reason === 'invalid') {
      setFieldError(result.field ?? null);
      setError(dict.common.required);
    } else if (result.reason === 'slot_full') {
      setError(dict.checkout.slotFull);
      const next = await slotsAction(today);
      setSlots(next);
      setSlotMinute(next.find((slot) => !slot.full)?.minute ?? null);
    } else if (result.reason === 'below_minimum') {
      setError(fill(dict.cart.minimum, { amount: formatMoney(RESTAURANT.deliveryMinimumCents, locale) }));
    } else if (result.reason === 'empty') {
      setError(dict.cart.empty);
    } else if (result.reason === 'unavailable') {
      setError(dict.checkout.quoteExpired);
    } else {
      setError(dict.checkout.error);
    }

    setBusy(false);
  }

  const free = slots.filter((slot) => !slot.full);
  const onCollection = method === 'on_collection';
  const cta = onCollection
    ? dict.checkout.sendOrder
    : fill(dict.checkout.continueTo, { method: methodLabels(dict)[method] });

  return (
    <form className={`${styles.board} glass`} onSubmit={submit} noValidate>
      <header className={styles.head}>
        <h1 className={styles.title}>{dict.checkout.secureTitle}</h1>
        <p className={styles.subtitle}>{dict.checkout.demoLabel}</p>
      </header>

      {/*
       * Three marks, the third lit. The basket and the contact details are
       * behind the guest by the time this screen opens, so they are drawn as
       * done rather than as places still to go.
       */}
      <ol className={styles.steps}>
        {[dict.checkout.stepCart, dict.checkout.stepContact, dict.checkout.stepPayment].map((label, index) => (
          <li key={label} className={styles.stepItem} data-state={index < 2 ? 'done' : 'now'}>
            <span className={styles.stepMark}>{index + 1}</span>
            <span className={styles.stepLabel}>{label}</span>
          </li>
        ))}
      </ol>

      <div className={styles.columns}>
        {/* ------------------------------------------------------ contact -- */}
        <div className={styles.left}>
          <section className={styles.group}>
            <h2 className={styles.groupTitle}>{dict.checkout.stepContact}</h2>

            <div className={styles.rows}>
              <Row
                id="name"
                label={dict.checkout.name}
                placeholder={dict.checkout.namePlaceholder}
                value={form.name}
                onChange={set('name')}
                autoComplete="name"
                invalid={fieldError === 'name'}
              />
              <Row
                id="email"
                type="email"
                label={dict.checkout.email}
                placeholder={dict.checkout.emailPlaceholder}
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                invalid={fieldError === 'email'}
              />
              <Row
                id="phone"
                type="tel"
                label={dict.checkout.phone}
                placeholder={dict.checkout.phonePlaceholder}
                value={form.phone}
                onChange={set('phone')}
                autoComplete="tel"
                invalid={fieldError === 'phone'}
              />

              {/*
               * Delivery is switched off, so the drawing shows no address and
               * neither does this screen. When the restaurant turns it on the
               * fields appear rather than the order failing on the server.
               */}
              {deliveryEnabled && fulfilment === 'delivery' ? (
                <>
                  <Row
                    id="street"
                    label={dict.checkout.street}
                    value={form.street}
                    onChange={set('street')}
                    autoComplete="street-address"
                    invalid={fieldError === 'street'}
                  />
                  <Row
                    id="postalCode"
                    label={dict.checkout.postalCode}
                    value={form.postalCode}
                    onChange={set('postalCode')}
                    autoComplete="postal-code"
                    invalid={fieldError === 'postalCode'}
                  />
                  <Row
                    id="city"
                    label={dict.checkout.city}
                    value={form.city}
                    onChange={set('city')}
                    autoComplete="address-level2"
                  />
                </>
              ) : null}
            </div>
          </section>

          {/* ---------------------------------------------------- method -- */}
          <section className={styles.group}>
            <h2 className={styles.groupTitle}>{dict.checkout.payMethod}</h2>

            <div className={styles.methods} role="radiogroup" aria-label={dict.checkout.payMethod}>
              <Method
                id="paypal"
                label={dict.checkout.payPaypal}
                chosen={method === 'paypal'}
                onChoose={setMethod}
                marks={<Mark tone="paypal">PayPal</Mark>}
              />
              <Method
                id="card"
                label={dict.checkout.payCard}
                chosen={method === 'card'}
                onChoose={setMethod}
                marks={
                  <>
                    <Mark tone="visa">VISA</Mark>
                    <Mark tone="mastercard">
                      <span className={styles.mcRings} aria-hidden="true" />
                      Mastercard
                    </Mark>
                  </>
                }
              />
              <Method
                id="wallet"
                label={dict.checkout.payWallet}
                chosen={method === 'wallet'}
                onChoose={setMethod}
                disabled={wallet !== 'available'}
                reason={wallet === 'checking' ? dict.checkout.walletChecking : dict.checkout.walletUnavailable}
                marks={
                  <>
                    <Mark tone="apple">Apple&nbsp;Pay</Mark>
                    <Mark tone="google">Google&nbsp;Pay</Mark>
                  </>
                }
              />
              <Method
                id="on_collection"
                label={dict.checkout.payOnCollection}
                chosen={method === 'on_collection'}
                onChoose={setMethod}
                marks={<CounterIcon />}
              />
            </div>

            {/*
             * The one sentence that has to sit under four payment marks while
             * none of them can take a cent.
             */}
            <p className={styles.honest}>{dict.checkout.noProvider}</p>
          </section>
        </div>

        {/* ------------------------------------------------------ summary -- */}
        <aside className={styles.summary}>
          <h2 className={styles.summaryTitle}>{dict.checkout.summary}</h2>

          <div className={styles.fulfil}>
            <BagIcon />
            <div className={styles.fulfilText}>
              <span className={styles.fulfilTitle}>
                {fulfilment === 'pickup' ? dict.order.pickup : dict.order.delivery}
              </span>
              <span className={styles.fulfilLine}>
                {fulfilment === 'pickup'
                  ? fill(dict.checkout.pickupHere, { when: dict.checkout.today })
                  : formatDate(today, locale)}
              </span>
            </div>
          </div>

          {/* Only offered when both are actually switched on; one of them alone
              is a statement, not a choice. */}
          {pickupEnabled && deliveryEnabled ? (
            <div className={styles.fulfilSwitch}>
              <button
                type="button"
                className="ghost"
                aria-pressed={fulfilment === 'pickup'}
                onClick={() => setFulfilment('pickup')}
              >
                {dict.order.pickup}
              </button>
              <button
                type="button"
                className="ghost"
                aria-pressed={fulfilment === 'delivery'}
                onClick={() => setFulfilment('delivery')}
              >
                {dict.order.delivery}
              </button>
            </div>
          ) : null}

          {/*
           * The kitchen cannot cook for a time nobody chose, and the basket
           * screen does not yet ask for one, so the hour is picked here — the
           * one control on this screen the drawing does not show.
           */}
          <label className={styles.time}>
            <span className={styles.timeLabel}>{dict.checkout.collectionTime}</span>
            {free.length ? (
              <span className={styles.timeControl}>
                <ClockIcon />
                <select
                  value={slotMinute ?? ''}
                  onChange={(event) => setSlotMinute(Number(event.target.value))}
                >
                  {free.map((slot) => (
                    <option key={slot.minute} value={slot.minute}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </span>
            ) : (
              <span className={styles.timeNone}>{dict.checkout.noSlots}</span>
            )}
          </label>

          <ul className={styles.lines}>
            {cart.lines.map((line) => (
              <li key={line.id} className={styles.line}>
                <span className={styles.lineName}>
                  {line.quantity} × {line.name}
                </span>
                <span className={styles.lineDots} aria-hidden="true" />
                <span className={styles.linePrice}>{formatMoney(line.totalCents, locale)}</span>
              </li>
            ))}
          </ul>

          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>{dict.cart.total}</span>
            <span className={styles.totalValue}>{formatMoney(cart.subtotalCents, locale)}</span>
          </div>
          <p className={styles.totalTax}>{fill(dict.cart.tax, { rate: RESTAURANT.taxRateBasisPoints / 100 })}</p>

          <label className={styles.accept}>
            <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
            <span className={styles.acceptBody}>
              <span className={styles.acceptTitle}>{dict.checkout.acceptTitle}</span>
              <span className={styles.acceptText}>
                <Sentence
                  template={dict.checkout.acceptText}
                  link={
                    <Link href={hrefFor(locale, 'orderTerms')} className={styles.acceptLink}>
                      {dict.checkout.termsShort}
                    </Link>
                  }
                />
              </span>
              <Link href={hrefFor(locale, 'privacy')} className={styles.acceptLink}>
                {dict.footer.privacy}
              </Link>
            </span>
          </label>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className={`cta ${styles.submit}`} disabled={busy || slotMinute === null}>
            {busy ? dict.checkout.processing : cta}
            <span aria-hidden="true">→</span>
          </button>

          <p className={styles.next}>{onCollection ? dict.checkout.payOnPickup : dict.checkout.confirmNext}</p>

          {demoMode ? <p className={styles.demo}>{dict.footer.demo}</p> : null}
          <p className={styles.fine}>{priceNote}</p>

          <Link href={hrefFor(locale, 'cart')} className={styles.back}>
            <span aria-hidden="true">←</span>
            {dict.checkout.backToCart}
          </Link>
        </aside>
      </div>
    </form>
  );
}

/** The wordmark the CTA names, so "Weiter zu PayPal" reads as the drawing does. */
function methodLabels(dict: Dictionary): Record<PaymentMethod, string> {
  return {
    paypal: dict.checkout.payPaypal,
    card: dict.checkout.payCard,
    wallet: dict.checkout.payWallet,
    on_collection: dict.checkout.payOnCollection,
  };
}

/**
 * A sentence with one link in the middle of it.
 *
 * The placeholder stays in the dictionary so a translator decides where the
 * link falls in their own word order, which `fill` cannot do — it returns a
 * string, and a string cannot hold an anchor.
 */
function Sentence({ template, link }: { template: string; link: React.ReactNode }) {
  const [before, after = ''] = template.split('{terms}');
  return (
    <>
      {before}
      {link}
      {after}
    </>
  );
}

function Row({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  invalid?: boolean;
}) {
  return (
    <div className={styles.row}>
      <label className={styles.rowLabel} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className={styles.rowInput}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
      />
    </div>
  );
}

function Method({
  id,
  label,
  marks,
  chosen,
  onChoose,
  disabled,
  reason,
}: {
  id: PaymentMethod;
  label: string;
  marks: React.ReactNode;
  chosen: boolean;
  onChoose: (method: PaymentMethod) => void;
  disabled?: boolean;
  reason?: string;
}) {
  return (
    <label className={styles.method} data-chosen={chosen || undefined} data-off={disabled || undefined}>
      <input
        type="radio"
        name="paymentMethod"
        className="visually-hidden"
        checked={chosen}
        disabled={disabled}
        onChange={() => onChoose(id)}
      />
      <span className={styles.methodDot} aria-hidden="true" />
      <span className={styles.methodLabel}>
        {label}
        {/* Why the row is off, beside the row, rather than nowhere. */}
        {disabled && reason ? <span className={styles.methodReason}>{reason}</span> : null}
      </span>
      <span className={styles.methodMarks}>{marks}</span>
    </label>
  );
}

/*
 * The marks are wordmarks, not the providers' artwork.
 *
 * A traced logo would be both a trademark reproduction and a stronger claim
 * than this site can make — none of these companies has been signed up. The
 * name in the provider's colour identifies the choice without pretending to a
 * relationship.
 */
function Mark({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={styles.mark} data-tone={tone}>
      {children}
    </span>
  );
}

/* Cash over a counter — the only one of the four with no brand behind it. */
function CounterIcon() {
  return (
    <svg width="26" height="18" viewBox="0 0 28 20" fill="none" aria-hidden="true">
      <rect x="1.4" y="4.4" width="21" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11.9" cy="10.9" r="3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M22.4 2.6h3.4a1 1 0 0 1 1 1v11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 8h14l-1.1 11.2a1.6 1.6 0 0 1-1.6 1.4H7.7a1.6 1.6 0 0 1-1.6-1.4Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M9 8V6.4a3 3 0 0 1 6 0V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 7.6V12l3 1.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
