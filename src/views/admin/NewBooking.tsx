'use client';

import { useActionState, useRef, useState } from 'react';
import styles from './Admin.module.css';
import { createBookingAction, type StaffBookingState } from '@/server/admin-actions';
import type { Locale } from '@/lib/i18n';

/**
 * A booking taken at the pass: over the telephone, or a party at the door.
 *
 * It does not check availability first. The people on the floor can see the
 * room; if nothing is free the booking is still written down and marked as
 * having no table, which is what actually happens in a restaurant.
 */
export function NewBooking({ locale, date }: { locale: Locale; date: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<StaffBookingState, FormData>(createBookingAction, {
    status: 'idle',
  });
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <div className={styles.newBar}>
        <button type="button" className="btn btn--sm" onClick={() => setOpen(true)}>
          + Reservierung eintragen
        </button>
        {state.status === 'saved' ? (
          <p className={styles.ok} role="status">
            {state.reference} gespeichert{state.seated ? '' : ' — kein Tisch frei, bitte zuweisen'}.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        action(formData);
        formRef.current?.reset();
        setOpen(false);
      }}
      className={styles.newForm}
    >
      <input type="hidden" name="locale" value={locale} />

      <div className={styles.newGrid}>
        <div className="field">
          <label htmlFor="nb-date">Datum</label>
          <input id="nb-date" name="date" type="date" className="input" defaultValue={date} required />
        </div>
        <div className="field">
          <label htmlFor="nb-time">Uhrzeit</label>
          <input id="nb-time" name="time" type="time" className="input" defaultValue="19:00" required />
        </div>
        <div className="field">
          <label htmlFor="nb-party">Personen</label>
          <input
            id="nb-party"
            name="partySize"
            type="number"
            min={1}
            max={40}
            className="input"
            defaultValue={2}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="nb-channel">Eingang</label>
          <select id="nb-channel" name="channel" className="select" defaultValue="phone">
            <option value="phone">Telefon</option>
            <option value="walk_in">Laufkunde</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="nb-name">Name</label>
          <input id="nb-name" name="name" className="input" required />
        </div>
        <div className="field">
          <label htmlFor="nb-phone">Telefon</label>
          <input id="nb-phone" name="phone" type="tel" className="input" required />
        </div>
        <div className="field">
          <label htmlFor="nb-email">E-Mail (optional)</label>
          <input id="nb-email" name="email" type="email" className="input" />
        </div>
        <div className="field">
          <label htmlFor="nb-note">Anmerkung</label>
          <input id="nb-note" name="note" className="input" maxLength={500} />
        </div>
      </div>

      {state.status === 'invalid' ? (
        <p className={styles.error} role="alert">
          Bitte Name, Telefon, Datum und Uhrzeit ausfüllen{state.field ? ` (${state.field})` : ''}.
        </p>
      ) : null}

      <div className={styles.newActions}>
        <button type="submit" className="btn btn--gold btn--sm" disabled={pending}>
          {pending ? 'Wird gespeichert …' : 'Eintragen'}
        </button>
        <button type="button" className="btn btn--sm" onClick={() => setOpen(false)}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
