'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './CheckoutForm.module.css';
import { placeOrderAction, slotsAction } from '@/server/actions';
import { formatMoney } from '@/lib/money';
import { fill, type Dictionary } from '@/lib/dictionary';
import { addDays, formatDate } from '@/lib/dates';
import type { Locale } from '@/lib/i18n';
import { RESTAURANT } from '@/lib/restaurant';
import type { Cart } from '@/server/cart';
import type { Slot } from '@/server/orders';

/**
 * Checkout.
 *
 * The form collects contact details and a collection time and hands them to the
 * server; it never sends a price. The summary on the right is rendered from the
 * cart the server already priced, and `placeOrderAction` prices it again before
 * writing anything, so the two cannot drift.
 *
 * An idempotency key is minted once per visit: a double-click, a flaky
 * connection or a browser retry all resolve to the same single order.
 */
export function CheckoutForm({
  locale,
  dict,
  cart,
  today,
  initialSlots,
  pickupEnabled,
  deliveryEnabled,
  demoMode,
}: {
  locale: Locale;
  dict: Dictionary;
  cart: Cart;
  today: string;
  initialSlots: Slot[];
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  demoMode: boolean;
}) {
  /*
   * A plain busy flag rather than `useTransition`: React 19 leaves a
   * transition's `isPending` stuck true once an awaited server action runs
   * inside it, which would disable every control on the page.
   */
  const [busy, setBusy] = useState(false);

  const [fulfilment, setFulfilment] = useState<'pickup' | 'delivery'>(pickupEnabled ? 'pickup' : 'delivery');
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [slotMinute, setSlotMinute] = useState<number | null>(initialSlots.find((slot) => !slot.full)?.minute ?? null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const idempotencyKey = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
  );

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    postalCode: '',
    city: RESTAURANT.city,
    addressNote: '',
  });

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await slotsAction(date);
      if (cancelled) return;
      setSlots(next);
      setSlotMinute(next.find((slot) => !slot.full)?.minute ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const free = useMemo(() => slots.filter((slot) => !slot.full), [slots]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldError(null);

    if (slotMinute === null) {
      setError(dict.checkout.noSlots);
      return;
    }

    setBusy(true);
    void place();
  }

  async function place() {
    if (slotMinute === null) return;

    const result = await placeOrderAction({
      locale,
      fulfilment,
      name: form.name,
      email: form.email,
      phone: form.phone,
      street: fulfilment === 'delivery' ? form.street : null,
      postalCode: fulfilment === 'delivery' ? form.postalCode : null,
      city: fulfilment === 'delivery' ? form.city : null,
      addressNote: form.addressNote || null,
      slotDate: date,
      slotMinute,
      idempotencyKey: idempotencyKey.current,
    });

    // A successful order never gets here: the action redirects to the order's
    // own page from the server.
    if (result.reason === 'invalid') {
      setFieldError(result.field ?? null);
      setError(dict.common.required);
    } else if (result.reason === 'slot_full') {
      setError(dict.checkout.slotFull);
      const next = await slotsAction(date);
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

    // Only reached when the order was refused; a placed order has already
    // redirected away from this page.
    setBusy(false);
  }

  return (
    <form className={styles.layout} onSubmit={submit} noValidate>
      {/* --------------------------------------------------------- form -- */}
      <div className={styles.main}>
        <fieldset className={styles.block}>
          <legend className={styles.legend}>{dict.order.choose}</legend>
          <div className={styles.choices}>
            {pickupEnabled ? (
              <label className={styles.choice} data-active={fulfilment === 'pickup'}>
                <input
                  type="radio"
                  name="fulfilment"
                  checked={fulfilment === 'pickup'}
                  onChange={() => setFulfilment('pickup')}
                  className="visually-hidden"
                />
                <span className={styles.choiceTitle}>{dict.order.pickup}</span>
                <span className={styles.choiceText}>{dict.order.pickupText}</span>
              </label>
            ) : null}

            {deliveryEnabled ? (
              <label className={styles.choice} data-active={fulfilment === 'delivery'}>
                <input
                  type="radio"
                  name="fulfilment"
                  checked={fulfilment === 'delivery'}
                  onChange={() => setFulfilment('delivery')}
                  className="visually-hidden"
                />
                <span className={styles.choiceTitle}>{dict.order.delivery}</span>
                <span className={styles.choiceText}>{dict.order.deliveryText}</span>
              </label>
            ) : (
              <p className={styles.hint}>{dict.order.deliveryOff}</p>
            )}
          </div>
        </fieldset>

        <fieldset className={styles.block}>
          <legend className={styles.legend}>{dict.checkout.contact}</legend>
          <div className={styles.fields}>
            <Field
              id="name"
              label={dict.checkout.name}
              value={form.name}
              onChange={set('name')}
              autoComplete="name"
              invalid={fieldError === 'name'}
              error={dict.common.required}
              required
            />
            <Field
              id="email"
              label={dict.checkout.email}
              type="email"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              invalid={fieldError === 'email'}
              error={dict.common.emailInvalid}
              required
            />
            <Field
              id="phone"
              label={dict.checkout.phone}
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
              invalid={fieldError === 'phone'}
              error={dict.common.phoneInvalid}
              required
            />
          </div>
        </fieldset>

        {fulfilment === 'delivery' ? (
          <fieldset className={styles.block}>
            <legend className={styles.legend}>{dict.checkout.address}</legend>
            <div className={styles.fields}>
              <Field
                id="street"
                label={dict.checkout.street}
                value={form.street}
                onChange={set('street')}
                autoComplete="street-address"
                invalid={fieldError === 'street'}
                error={dict.common.required}
                required
              />
              <Field
                id="postalCode"
                label={dict.checkout.postalCode}
                value={form.postalCode}
                onChange={set('postalCode')}
                autoComplete="postal-code"
                invalid={fieldError === 'postalCode'}
                error={dict.checkout.outsideZone}
              />
              <Field id="city" label={dict.checkout.city} value={form.city} onChange={set('city')} autoComplete="address-level2" />
              <Field id="addressNote" label={dict.checkout.addressNote} value={form.addressNote} onChange={set('addressNote')} />
            </div>
          </fieldset>
        ) : null}

        <fieldset className={styles.block}>
          <legend className={styles.legend}>{dict.checkout.timing}</legend>

          <div className={styles.fields}>
            <div className="field">
              <label htmlFor="slot-date">{dict.reserve.date}</label>
              <input
                id="slot-date"
                type="date"
                className="input"
                value={date}
                min={today}
                max={addDays(today, 14)}
                onChange={(event) => setDate(event.target.value)}
              />
              <p className="field-hint">{formatDate(date, locale)}</p>
            </div>
          </div>

          {free.length ? (
            <div className={styles.slots} role="group" aria-label={dict.checkout.pickTime}>
              {slots.map((slot) => (
                <button
                  key={slot.minute}
                  type="button"
                  className={styles.slot}
                  disabled={slot.full}
                  aria-pressed={slot.minute === slotMinute}
                  onClick={() => setSlotMinute(slot.minute)}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.hint}>{busy ? dict.common.loading : dict.checkout.noSlots}</p>
          )}
        </fieldset>
      </div>

      {/* ------------------------------------------------------ summary -- */}
      <aside className={styles.summary}>
        <h2 className={styles.summaryTitle}>{dict.checkout.review}</h2>

        <ul className={styles.summaryLines}>
          {cart.lines.map((line) => (
            <li key={line.id}>
              <span className={styles.summaryQty}>{line.quantity}×</span>
              <span className={styles.summaryName}>
                {line.name}
                <span className={styles.summaryVariant}>{line.variantLabel}</span>
              </span>
              <span className={styles.summaryPrice}>{formatMoney(line.totalCents, locale)}</span>
            </li>
          ))}
        </ul>

        <dl className={styles.totals}>
          <div>
            <dt>{dict.cart.subtotal}</dt>
            <dd>{formatMoney(cart.subtotalCents, locale)}</dd>
          </div>
          <div className={styles.totalsMuted}>
            <dt>{fill(dict.cart.tax, { rate: RESTAURANT.taxRateBasisPoints / 100 })}</dt>
            <dd>{formatMoney(cart.taxCents, locale)}</dd>
          </div>
          <div className={styles.grand}>
            <dt>{dict.cart.total}</dt>
            <dd>{formatMoney(cart.subtotalCents, locale)}</dd>
          </div>
        </dl>

        {/*
         * No payment provider is connected. Rather than a fake card form, the
         * order is recorded and paid on collection — and the page says exactly
         * that instead of implying a charge that never happens.
         */}
        <p className={styles.payment}>{demoMode ? dict.footer.demo : dict.checkout.paymentIntro}</p>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
          {busy ? dict.checkout.processing : dict.checkout.place}
        </button>

        <p className={styles.terms}>{dict.checkout.terms}</p>
      </aside>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  required,
  invalid,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  invalid?: boolean;
  error?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className="input"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
      />
      {invalid && error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
