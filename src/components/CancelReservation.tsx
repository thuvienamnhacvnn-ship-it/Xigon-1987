'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CancelReservation.module.css';
import { cancelReservationAction } from '@/server/actions';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';

/**
 * Cancelling.
 *
 * Deliberately two clicks — cancelling a table by accident is not recoverable
 * from the guest's side — and the second click is the destructive one, so it is
 * the one that carries the warning.
 */
export function CancelReservation({
  locale,
  dict,
  token,
}: {
  locale: Locale;
  dict: Dictionary;
  token: string;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A plain flag, not `useTransition`: an awaited server action inside a
  // transition leaves `isPending` stuck true in React 19.
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    try {
      const result = await cancelReservationAction(token, locale);
      if (result.ok) {
        setAsking(false);
        router.refresh();
        return;
      }
      setError(result.reason === 'too_late' ? dict.reservation.tooLate : dict.reservation.notFound);
    } finally {
      setBusy(false);
    }
  }

  if (!asking) {
    return (
      <div className={styles.wrap}>
        <button type="button" className={styles.trigger} onClick={() => setAsking(true)}>
          {dict.reservation.cancel}
        </button>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.confirm} role="group" aria-label={dict.reservation.cancel}>
      <p className={styles.question}>{dict.reservation.cancelConfirm}</p>
      <div className={styles.buttons}>
        <button type="button" className={styles.yes} onClick={() => void cancel()} disabled={busy}>
          {busy ? dict.checkout.processing : dict.reservation.yes}
        </button>
        <button type="button" className={styles.no} onClick={() => setAsking(false)}>
          {dict.reservation.no}
        </button>
      </div>
    </div>
  );
}
