'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ReserveFlow.module.css';
import { availabilityAction, confirmReservationAction, holdSlotAction } from '@/server/actions';
import { fill, type Dictionary } from '@/lib/dictionary';
import { addDays, formatDate } from '@/lib/dates';
import type { Locale } from '@/lib/i18n';
import { RESTAURANT, phoneHref } from '@/lib/restaurant';

type Slot = { minute: number; label: string };

/**
 * Booking a table, in four steps.
 *
 * The times shown are the times actually free at the moment of asking. Picking
 * one takes a short hold on a specific table, so the guest fills in their
 * details against a table nobody else can take from under them; if they walk
 * away, the hold lapses and the time returns to the pool. That is the whole
 * difference between a booking form and a booking system.
 */
export function ReserveFlow({
  locale,
  dict,
  today,
  maxDate,
  initialDate,
  initialGuests,
  enabled,
}: {
  locale: Locale;
  dict: Dictionary;
  today: string;
  maxDate: string;
  initialDate: string;
  initialGuests: number;
  enabled: boolean;
}) {
  /*
   * A plain busy flag rather than `useTransition`.
   *
   * React 19 keeps a transition pending until everything it started settles,
   * and an awaited server action inside one leaves `isPending` stuck true —
   * which disables every button on the page. The work here is a request and a
   * setState, so a boolean is both simpler and correct.
   */
  const [busy, setBusy] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [date, setDate] = useState(initialDate);
  const [guests, setGuests] = useState(initialGuests);

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [state, setState] = useState<'idle' | 'closed' | 'past' | 'too_large' | 'none'>('idle');
  const [hoursConfirmed, setHoursConfirmed] = useState(true);
  const [duration, setDuration] = useState<number>(RESTAURANT.reservationDurationMinutes);

  const [hold, setHold] = useState<{ token: string; minute: number; expiresAt: number } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [guest, setGuest] = useState({ name: '', email: '', phone: '', occasion: '', note: '' });
  const set = (key: keyof typeof guest) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setGuest((current) => ({ ...current, [key]: event.target.value }));

  const liveRef = useRef<HTMLParagraphElement>(null);

  /* --- the hold's own clock, so an expired hold is visible, not a surprise --- */
  useEffect(() => {
    if (!hold) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.round((hold.expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        setHold(null);
        setStep(2);
        setError(dict.reserve.holdExpired);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hold, dict.reserve.holdExpired]);

  async function findTimes() {
    setError(null);
    setBusy(true);
    try {
      const result = await availabilityAction({ date, partySize: guests });
      if (result.kind === 'ok') {
        setSlots(result.slots);
        setDuration(result.durationMinutes);
        setHoursConfirmed(result.hoursConfirmed);
        setState(result.slots.length ? 'idle' : 'none');
      } else {
        setSlots([]);
        setState(result.kind === 'closed' ? 'closed' : result.kind === 'past' ? 'past' : 'too_large');
      }
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  async function choose(minute: number) {
    setError(null);
    setBusy(true);
    try {
      const result = await holdSlotAction({ date, minute, partySize: guests });
      if (!result.ok) {
        setError(result.reason === 'taken' ? dict.reserve.conflict : dict.reserve.noTimes);
        // Someone else took it while this page was open: re-ask the server.
        const refreshed = await availabilityAction({ date, partySize: guests });
        setSlots(refreshed.kind === 'ok' ? refreshed.slots : []);
        return;
      }
      setHold({ token: result.token, minute: result.minute, expiresAt: new Date(result.expiresAt).getTime() });
      setStep(3);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!hold) return;
    setError(null);
    setFieldError(null);
    setBusy(true);

    const result = await confirmReservationAction({
      holdToken: hold.token,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      occasion: guest.occasion || null,
      note: guest.note || null,
      locale,
    });

    // A confirmed booking never gets here: the action redirects to the
    // reservation's own page from the server.
    if (result.reason === 'invalid') {
      setFieldError(result.field ?? null);
      setError(dict.common.required);
    } else if (result.reason === 'hold_expired') {
      setHold(null);
      setStep(2);
      setError(dict.reserve.holdExpired);
    } else if (result.reason === 'taken') {
      setHold(null);
      setStep(2);
      setError(dict.reserve.conflict);
    } else {
      setError(dict.reserve.disabled);
    }

    setBusy(false);
  }

  if (!enabled) {
    return (
      <div className={styles.disabled}>
        <p>{dict.reserve.disabled}</p>
        <a href={phoneHref(RESTAURANT.phone)} className="btn btn--gold">
          {dict.contact.call} {RESTAURANT.phone}
        </a>
      </div>
    );
  }

  const steps = [dict.reserve.steps.when, dict.reserve.steps.time, dict.reserve.steps.details];

  return (
    <div className={styles.flow}>
      <ol className={styles.steps}>
        {steps.map((label, index) => (
          <li key={label} className={styles.step} data-state={step === index + 1 ? 'current' : step > index + 1 ? 'done' : 'todo'}>
            <span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      <p className={styles.live} ref={liveRef} role="status">
        {busy ? dict.reserve.searching : ''}
      </p>

      {/* ---------------------------------------------------- step 1 ----- */}
      <section className={styles.panel} hidden={step !== 1}>
        <div className={styles.row}>
          <div className="field">
            <label htmlFor="reserve-date">{dict.reserve.date}</label>
            <input
              id="reserve-date"
              type="date"
              className="input"
              value={date}
              min={today}
              max={maxDate}
              onChange={(event) => setDate(event.target.value)}
            />
            <p className="field-hint">{formatDate(date, locale)}</p>
          </div>

          <div className="field">
            <label htmlFor="reserve-guests">{dict.reserve.guests}</label>
            <select
              id="reserve-guests"
              className="select"
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
            >
              {Array.from({ length: RESTAURANT.reservationMaxPartyOnline }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? dict.reserve.guestsOne : fill(dict.reserve.guestsMany, { n })}
                </option>
              ))}
            </select>
            <p className="field-hint">{fill(dict.reserve.largeParty, { n: RESTAURANT.reservationMaxPartyOnline + 1 })}</p>
          </div>
        </div>

        <button type="button" className="btn btn--gold" onClick={() => void findTimes()} disabled={busy}>
          {busy ? dict.reserve.searching : dict.reserve.findTimes}
        </button>
      </section>

      {/* ---------------------------------------------------- step 2 ----- */}
      <section className={styles.panel} hidden={step !== 2}>
        <div className={styles.summaryLine}>
          <span>{formatDate(date, locale)}</span>
          <span>·</span>
          <span>{guests === 1 ? dict.reserve.guestsOne : fill(dict.reserve.guestsMany, { n: guests })}</span>
          <button type="button" className={styles.change} onClick={() => setStep(1)}>
            {dict.reserve.back}
          </button>
        </div>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {state === 'closed' ? (
          <p className={styles.note}>{dict.reserve.closedDay}</p>
        ) : state === 'too_large' ? (
          <p className={styles.note}>{fill(dict.reserve.largeParty, { n: RESTAURANT.reservationMaxPartyOnline + 1 })}</p>
        ) : state === 'none' || (slots && slots.length === 0) ? (
          <div className={styles.note}>
            <p>{dict.reserve.noTimes}</p>
            <a href={phoneHref(RESTAURANT.phone)} className="linkArrow">
              {RESTAURANT.phone}
            </a>
          </div>
        ) : (
          <>
            <p className="label">{dict.reserve.pickTime}</p>
            <div className={styles.slots}>
              {slots?.map((slot) => (
                <button
                  key={slot.minute}
                  type="button"
                  className={styles.slot}
                  onClick={() => void choose(slot.minute)}
                  disabled={busy}
                >
                  {slot.label}
                </button>
              ))}
            </div>
            <p className={styles.hint}>{fill(dict.reserve.duration, { n: duration })}</p>
            {!hoursConfirmed ? <p className={styles.hint}>{dict.contact.hoursPending}</p> : null}
          </>
        )}
      </section>

      {/* ---------------------------------------------------- step 3 ----- */}
      <section className={styles.panel} hidden={step !== 3}>
        <form onSubmit={submit} noValidate>
          <div className={styles.summaryLine}>
            <span>{formatDate(date, locale)}</span>
            <span>·</span>
            <span>{slots?.find((slot) => slot.minute === hold?.minute)?.label}</span>
            <span>·</span>
            <span>{guests === 1 ? dict.reserve.guestsOne : fill(dict.reserve.guestsMany, { n: guests })}</span>
            <button type="button" className={styles.change} onClick={() => setStep(2)}>
              {dict.reserve.back}
            </button>
          </div>

          {secondsLeft !== null ? (
            <p className={styles.holdClock}>
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
            </p>
          ) : null}

          <div className={styles.row}>
            <div className="field">
              <label htmlFor="guest-name">{dict.reserve.name} *</label>
              <input
                id="guest-name"
                className="input"
                value={guest.name}
                onChange={set('name')}
                autoComplete="name"
                aria-invalid={fieldError === 'name' || undefined}
              />
            </div>
            <div className="field">
              <label htmlFor="guest-phone">{dict.reserve.phone} *</label>
              <input
                id="guest-phone"
                type="tel"
                className="input"
                value={guest.phone}
                onChange={set('phone')}
                autoComplete="tel"
                aria-invalid={fieldError === 'phone' || undefined}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="guest-email">{dict.reserve.email} *</label>
            <input
              id="guest-email"
              type="email"
              className="input"
              value={guest.email}
              onChange={set('email')}
              autoComplete="email"
              aria-invalid={fieldError === 'email' || undefined}
            />
          </div>

          <div className={styles.row}>
            <div className="field">
              <label htmlFor="guest-occasion">{dict.reserve.occasion}</label>
              <input id="guest-occasion" className="input" value={guest.occasion} onChange={set('occasion')} />
            </div>
            <div className="field">
              <label htmlFor="guest-note">{dict.reserve.note}</label>
              <input id="guest-note" className="input" value={guest.note} onChange={set('note')} />
            </div>
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn btn--gold btn--block" disabled={busy || !hold}>
            {dict.reserve.confirm}
          </button>
        </form>
      </section>
    </div>
  );
}
