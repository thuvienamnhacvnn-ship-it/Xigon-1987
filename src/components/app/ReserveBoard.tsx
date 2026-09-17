'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ReserveBoard.module.css';
import { EdgeLight } from './EdgeLight';
import { availabilityAction, confirmReservationAction, holdSlotAction } from '@/server/actions';
import { addDays, formatDate } from '@/lib/dates';
import { fill, type Dictionary } from '@/lib/dictionary';
import { RESTAURANT, phoneHref } from '@/lib/restaurant';
import type { Locale } from '@/lib/i18n';

export type Slot = { minute: number; label: string };
export type InitialAvailability =
  | { kind: 'ok'; slots: Slot[]; durationMinutes: number; hoursConfirmed: boolean }
  | { kind: 'closed' | 'past' | 'too_large' };

type Seating = 'dining' | 'bar';

/** Six is what the drawing shows; eight still fits two rows at this width. */
const VISIBLE_TIMES = 8;

/**
 * Reservieren.
 *
 * The screen arrives with the answer already on it. The first version asked for
 * a date and a party size and then made the guest press a button to find out
 * whether anything was free at all — three interactions before the screen says
 * anything a guest can act on. The free times for today are computed on the
 * server and rendered with the page; changing the date or the number of people
 * fetches the next set.
 *
 * Nothing here is invented. The times come from real tables, real bookings and
 * other guests' live holds; where the schedule behind them is still a
 * placeholder the screen says so rather than implying the hours are settled.
 */
export function ReserveBoard({
  locale,
  dict,
  initialDate,
  initialGuests,
  initial,
  autoConfirm,
  enabled,
}: {
  locale: Locale;
  dict: Dictionary;
  initialDate: string;
  initialGuests: number;
  initial: InitialAvailability;
  autoConfirm: boolean;
  enabled: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [date, setDate] = useState(initialDate);
  const [guests, setGuests] = useState(initialGuests);
  const [seating, setSeating] = useState<Seating | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  /*
   * A full service is thirty quarter-hours, and thirty pills is a wall. The
   * drawing shows six. Most of them are lunchtime on an empty Tuesday, so the
   * screen offers a first handful and lets the guest ask for the rest.
   */
  const [allTimes, setAllTimes] = useState(false);

  const [slots, setSlots] = useState<Slot[]>(initial.kind === 'ok' ? initial.slots : []);
  const [state, setState] = useState<'ok' | 'closed' | 'past' | 'too_large'>(
    initial.kind === 'ok' ? 'ok' : initial.kind,
  );
  const [duration, setDuration] = useState(
    initial.kind === 'ok' ? initial.durationMinutes : RESTAURANT.reservationDurationMinutes,
  );
  const [hoursConfirmed, setHoursConfirmed] = useState(initial.kind === 'ok' ? initial.hoursConfirmed : true);

  const [busy, setBusy] = useState(false);
  const [hold, setHold] = useState<{ token: string; minute: number; expiresAt: number } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guest, setGuest] = useState({ name: '', email: '', phone: '', occasion: '', note: '' });

  /*
   * The first set of times came with the page, so this must not run on mount
   * and throw it away — it would replace a rendered answer with a spinner for
   * no reason. It runs only when the guest changes something.
   */
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let cancelled = false;
    setBusy(true);
    void availabilityAction({ date, partySize: guests })
      .then((result) => {
        if (cancelled) return;
        setHold(null);
        setChosen(null);
        if (result.kind === 'ok') {
          setSlots(result.slots);
          setDuration(result.durationMinutes);
          setHoursConfirmed(result.hoursConfirmed);
          setState('ok');
        } else {
          setSlots([]);
          setState(result.kind);
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, guests]);

  /* The hold is a promise with a clock on it, so the clock has to be visible. */
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
        setStep(1);
        setError(dict.reserve.holdExpired);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [hold, dict.reserve.holdExpired]);

  async function take(minute: number) {
    if (busy || !enabled) return;
    setBusy(true);
    setError(null);
    const result = await holdSlotAction({ date, minute, partySize: guests });
    setBusy(false);
    if (!result.ok) {
      setError(result.reason === 'taken' ? dict.reserve.conflict : dict.reserve.noTimes);
      const refreshed = await availabilityAction({ date, partySize: guests });
      if (refreshed.kind === 'ok') setSlots(refreshed.slots);
      return;
    }
    setHold({ token: result.token, minute: result.minute, expiresAt: new Date(result.expiresAt).getTime() });
    setStep(2);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hold || busy) return;
    setBusy(true);
    setError(null);
    /*
     * A plain busy flag, not `useTransition`. An awaited server action inside a
     * transition leaves `isPending` stuck true in React 19 and the form never
     * comes back — this project has paid for that lesson once already.
     */
    const result = await confirmReservationAction({
      holdToken: hold.token,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      occasion: guest.occasion || null,
      seatingPreference: seating,
      note: guest.note || null,
      locale,
    });
    /*
     * There is no success branch. A confirmed booking redirects from the server
     * to its own page, so this line is only ever reached when something went
     * wrong — which is also why the submit is not wrapped in a transition.
     */
    setBusy(false);
    setHold(null);
    setStep(1);
    setError(
      result.reason === 'hold_expired'
        ? dict.reserve.holdExpired
        : result.reason === 'disabled'
          ? dict.reserve.disabled
          : dict.reserve.conflict,
    );
  }

  const days = Array.from({ length: 30 }, (_, index) => addDays(initialDate, index));
  const held = hold ? slots.find((slot) => slot.minute === hold.minute) : null;

  return (
    <div className={styles.board}>
      {/* ---------- the room, left ---------- */}
      <aside className={`glass ${styles.plate}`}>
        <EdgeLight />
        <img src="/img/scene/dining-room-1280.webp" alt="" className={styles.plateImg} />
        <div className={styles.plateCopy}>
          <h1 className={styles.plateTitle}>{dict.reserve.tableWaits}</h1>
          <p className={styles.plateLines}>
            {dict.reserve.tableLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <span className={styles.plateRule} aria-hidden="true" />
        </div>
      </aside>

      {/* ---------- the form, right ---------- */}
      <section className={`glass ${styles.form}`}>
        <EdgeLight />
        <h2 className={styles.title}>{dict.reserve.title}</h2>

        <ol className={styles.steps}>
          {[dict.reserve.steps.when, dict.reserve.steps.details, dict.reserve.steps.review].map(
            (label, index) => (
              <li key={label} className={styles.stepItem} data-state={stepState(step, index + 1)}>
                <span className={styles.stepMark}>{index + 1}</span>
                <span className={styles.stepLabel}>{label}</span>
              </li>
            ),
          )}
        </ol>

        {step === 1 ? (
          <div className={styles.body}>
            <div className={styles.pair}>
              <label className={styles.field}>
                <span>{dict.reserve.date}</span>
                <span className={styles.control}>
                  <CalendarIcon />
                  <select value={date} onChange={(event) => setDate(event.target.value)}>
                    {days.map((day) => (
                      <option key={day} value={day}>
                        {formatDate(day, locale)}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className={styles.field}>
                <span>{dict.reserve.guests}</span>
                <span className={styles.control}>
                  <GuestsIcon />
                  <select value={guests} onChange={(event) => setGuests(Number(event.target.value))}>
                    {Array.from({ length: RESTAURANT.reservationMaxPartyOnline }, (_, index) => index + 1).map(
                      (count) => (
                        <option key={count} value={count}>
                          {count === 1 ? dict.reserve.guestsOne : fill(dict.reserve.guestsMany, { n: count })}
                        </option>
                      ),
                    )}
                  </select>
                </span>
              </label>
            </div>

            <div className={styles.group}>
              <span className={styles.groupLabel}>{dict.reserve.pickTime}</span>
              {state === 'ok' && slots.length ? (
                <div className={styles.slots}>
                  {(allTimes ? slots : slots.slice(0, VISIBLE_TIMES)).map((slot) => (
                    <button
                      key={slot.minute}
                      type="button"
                      className={`ghost ${styles.slot}`}
                      aria-pressed={chosen === slot.minute}
                      disabled={busy || !enabled}
                      onClick={() => setChosen(slot.minute)}
                    >
                      {slot.label}
                    </button>
                  ))}
                  {!allTimes && slots.length > VISIBLE_TIMES ? (
                    <button type="button" className={styles.more} onClick={() => setAllTimes(true)}>
                      +{slots.length - VISIBLE_TIMES}
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className={styles.note}>
                  {busy
                    ? dict.reserve.searching
                    : state === 'closed'
                      ? dict.reserve.closedDay
                      : state === 'too_large'
                        ? fill(dict.reserve.largeParty, { n: RESTAURANT.reservationMaxPartyOnline })
                        : dict.reserve.noTimes}
                </p>
              )}
            </div>

            <div className={styles.group}>
              <span className={styles.groupLabel}>{dict.reserve.seating}</span>
              <div className={styles.seating}>
                <button
                  type="button"
                  className={`ghost ${styles.seat}`}
                  aria-pressed={seating === 'dining'}
                  onClick={() => setSeating(seating === 'dining' ? null : 'dining')}
                >
                  <ChairIcon />
                  {dict.reserve.seatingDining}
                </button>
                <button
                  type="button"
                  className={`ghost ${styles.seat}`}
                  aria-pressed={seating === 'bar'}
                  onClick={() => setSeating(seating === 'bar' ? null : 'bar')}
                >
                  <GlassIcon />
                  {dict.reserve.seatingBar}
                </button>
              </div>
            </div>

            <p className={styles.info}>
              <InfoIcon />
              {/*
               * Two caveats a guest is entitled to before choosing: how long the
               * table is held for them, and — while the published hours still
               * contradict each other — that the schedule is a placeholder.
               */}
              {fill(dict.reserve.duration, { n: duration })}
              {hoursConfirmed ? '' : ` ${dict.reserve.hoursProvisional}`}
            </p>

            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}

            {!enabled ? <p className={styles.note}>{dict.reserve.disabled}</p> : null}

            {/*
              * Choosing a time does not yet take it. The hold — which locks a
              * real table away from other guests for eight minutes — is claimed
              * here, when the guest says they mean it, rather than on a stray
              * tap at a row of times.
              */}
            <button
              type="button"
              className={`cta ${styles.submit}`}
              disabled={chosen === null || busy || !enabled}
              onClick={() => (chosen === null ? undefined : void take(chosen))}
            >
              {busy ? dict.reserve.searching : dict.reserve.next}
              <span aria-hidden="true">→</span>
            </button>

            <p className={styles.aside}>
              <span className={styles.asideRule} aria-hidden="true" />
              {fill(dict.reserve.largeParty, { n: RESTAURANT.reservationMaxPartyOnline })}{' '}
              <a href={phoneHref(RESTAURANT.phone)} className={styles.asideLink}>
                {dict.contact.call} →
              </a>
            </p>
          </div>
        ) : null}

        {step === 2 && hold ? (
          <form className={styles.body} onSubmit={submit}>
            <p className={styles.held}>
              {held?.label ?? ''} · {formatDate(date, locale)}
              {secondsLeft !== null ? (
                <span className={styles.clock}>
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </span>
              ) : null}
            </p>

            <div className={styles.pair}>
              <label className={styles.field}>
                <span>{dict.reserve.name}</span>
                <span className={styles.control}>
                  <input
                    value={guest.name}
                    required
                    autoComplete="name"
                    onChange={(event) => setGuest({ ...guest, name: event.target.value })}
                  />
                </span>
              </label>
              <label className={styles.field}>
                <span>{dict.reserve.phone}</span>
                <span className={styles.control}>
                  <input
                    value={guest.phone}
                    required
                    type="tel"
                    autoComplete="tel"
                    onChange={(event) => setGuest({ ...guest, phone: event.target.value })}
                  />
                </span>
              </label>
            </div>

            <label className={styles.field}>
              <span>{dict.reserve.email}</span>
              <span className={styles.control}>
                <input
                  value={guest.email}
                  required
                  type="email"
                  autoComplete="email"
                  onChange={(event) => setGuest({ ...guest, email: event.target.value })}
                />
              </span>
            </label>

            <label className={styles.field}>
              <span>{dict.reserve.note}</span>
              <span className={styles.control}>
                <input
                  value={guest.note}
                  onChange={(event) => setGuest({ ...guest, note: event.target.value })}
                />
              </span>
            </label>

            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}

            <div className={styles.actions}>
              <button type="button" className="ghost" onClick={() => setStep(1)}>
                {dict.reserve.back}
              </button>
              <button type="submit" className={`cta ${styles.submit}`} disabled={busy}>
                {busy ? dict.reserve.submitting : dict.reserve.confirm}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        ) : null}


      </section>
    </div>
  );
}

function stepState(current: number, index: number) {
  if (current === index) return 'now';
  return current > index ? 'done' : 'todo';
}

const line = { stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="5" width="17.6" height="16" rx="2.5" {...line} />
      <path d="M3.2 10h17.6M8 3v4M16 3v4" {...line} />
    </svg>
  );
}

function GuestsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9.2" cy="8.4" r="3.2" {...line} />
      <path d="M2.8 19.4c.7-3.2 3.3-5 6.4-5s5.7 1.8 6.4 5" {...line} />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 6M17.6 14.8c2.1.5 3.4 2.1 3.9 4.6" {...line} />
    </svg>
  );
}

function ChairIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 4v7h14V4M3.4 11h17.2M6.4 11v9M17.6 11v9" {...line} />
    </svg>
  );
}

function GlassIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4h16l-8 8-8-8ZM12 12v7M8.4 19.6h7.2" {...line} />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" {...line} />
      <path d="M12 11v5.2M12 7.8h.01" {...line} />
    </svg>
  );
}
