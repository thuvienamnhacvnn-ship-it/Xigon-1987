'use client';

import { useActionState, useState } from 'react';
import styles from './Admin.module.css';
import { assignTableAction, setStaffNoteAction, setStatusAction, type AssignState } from '@/server/admin-actions';
import type { ReservationStatus } from '@/db/schema';
import type { Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * What a member of staff can do to one booking, in the order a service does it.
 *
 * Cancelling is set apart from the rest and asks once, because it is the only
 * one of these the guest finds out about by turning up to no table.
 */
const FLOW: { status: ReservationStatus; label: string }[] = [
  { status: 'confirmed', label: 'Bestätigen' },
  { status: 'seated', label: 'Am Tisch' },
  { status: 'completed', label: 'Fertig' },
];

const STATUS_LABEL: Record<ReservationStatus, string> = {
  requested: 'Anfrage',
  confirmed: 'Bestätigt',
  seated: 'Am Tisch',
  completed: 'Abgeschlossen',
  cancelled_by_guest: 'Gast abgesagt',
  cancelled_by_restaurant: 'Wir abgesagt',
  no_show: 'Nicht erschienen',
};

export function BookRowActions({
  locale,
  dict,
  date,
  id,
  status,
  tableId,
  tables,
  staffNote,
}: {
  locale: Locale;
  dict: Dictionary;
  date: string;
  id: number;
  status: ReservationStatus;
  tableId: number | null;
  tables: { id: number; code: string; seatsMin: number; seatsMax: number; active: boolean }[];
  staffNote: string | null;
}) {
  const [assign, assignAction, assigning] = useActionState<AssignState, FormData>(assignTableAction, {
    status: 'idle',
  });
  const [asking, setAsking] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const hidden = (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="locale" value={locale} />
    </>
  );

  return (
    <div className={styles.rowActions}>
      <p className={styles.status} data-status={status}>
        {STATUS_LABEL[status]}
      </p>

      {/* ---------------------------------------------------------- table -- */}
      <form action={assignAction} className={styles.assign}>
        {hidden}
        <label htmlFor={`table-${id}`} className="visually-hidden">
          Tisch
        </label>
        <select
          id={`table-${id}`}
          name="tableId"
          className="select"
          defaultValue={tableId ?? 0}
          disabled={assigning}
        >
          <option value={0}>Kein Tisch</option>
          {tables.map((table) => (
            <option key={table.id} value={table.id} disabled={!table.active}>
              {table.code} ({table.seatsMin}–{table.seatsMax})
            </option>
          ))}
        </select>
        <button type="submit" className={styles.small} disabled={assigning}>
          Setzen
        </button>
      </form>
      {assign.status === 'taken' ? (
        <p className={styles.error} role="alert">
          Dieser Tisch ist zu der Zeit belegt.
        </p>
      ) : null}

      {/* ---------------------------------------------------------- flow --- */}
      <div className={styles.flow}>
        {FLOW.filter((step) => step.status !== status).map((step) => (
          <form key={step.status} action={setStatusAction}>
            {hidden}
            <input type="hidden" name="status" value={step.status} />
            <button type="submit" className={styles.small}>
              {step.label}
            </button>
          </form>
        ))}

        <form action={setStatusAction}>
          {hidden}
          <input type="hidden" name="status" value="no_show" />
          <button type="submit" className={styles.small}>
            Nicht da
          </button>
        </form>

        <button type="button" className={styles.smallDanger} onClick={() => setAsking((value) => !value)}>
          Absagen
        </button>

        <button type="button" className={styles.small} onClick={() => setNoteOpen((value) => !value)}>
          Notiz
        </button>
      </div>

      {asking ? (
        <form action={setStatusAction} className={styles.confirm}>
          {hidden}
          <input type="hidden" name="status" value="cancelled_by_restaurant" />
          <span>Reservierung wirklich absagen?</span>
          <button type="submit" className={styles.smallDanger}>
            Ja, absagen
          </button>
          <button type="button" className={styles.small} onClick={() => setAsking(false)}>
            Zurück
          </button>
        </form>
      ) : null}

      {noteOpen ? (
        <form action={setStaffNoteAction} className={styles.noteForm}>
          {hidden}
          <label htmlFor={`note-${id}`} className="visually-hidden">
            Interne Notiz
          </label>
          <input
            id={`note-${id}`}
            name="staffNote"
            className="input"
            defaultValue={staffNote ?? ''}
            maxLength={500}
            placeholder="Interne Notiz — der Gast sieht sie nicht"
          />
          <button type="submit" className={styles.small}>
            {dict.common.yes === 'Ja' ? 'Speichern' : 'Save'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
