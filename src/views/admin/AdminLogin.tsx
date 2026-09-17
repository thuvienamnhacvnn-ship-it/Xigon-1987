'use client';

import { useActionState } from 'react';
import styles from './Admin.module.css';
import { signInAction, type SignInState } from '@/server/admin-actions';

const MESSAGE: Record<Exclude<SignInState['status'], 'idle'>, string> = {
  wrong: 'Passwort stimmt nicht.',
  not_configured: 'Für dieses System ist kein Passwort hinterlegt.',
  rate_limited: 'Zu viele Versuche. Bitte einen Moment warten.',
};

export function AdminLogin() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, { status: 'idle' });

  return (
    <div className={styles.gate}>
      <form action={action} className={styles.gateBox}>
        <h1 className={styles.gateTitle}>Backoffice</h1>

        <div className="field">
          <label htmlFor="admin-password">Passwort</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            className="input"
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>

        {state.status !== 'idle' ? (
          <p className={styles.error} role="alert">
            {MESSAGE[state.status]}
          </p>
        ) : null}

        <button type="submit" className="btn btn--gold btn--block" disabled={pending}>
          {pending ? 'Einen Moment …' : 'Anmelden'}
        </button>

        {/* The lockout is stated up front, so a mistyped password does not feel
            like the system breaking. */}
        <p className={styles.gateHint}>Nach acht Fehlversuchen ist die Anmeldung zehn Minuten gesperrt.</p>
      </form>
    </div>
  );
}
