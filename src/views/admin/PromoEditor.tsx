'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import styles from './Admin.module.css';
import { savePromotionAction, type PromoState } from '@/server/promo-actions';

/**
 * One offer, in full.
 *
 * The same form writes a new offer and edits an existing one — an edit screen
 * that differs from the create screen is an edit screen where a field quietly
 * goes missing. The only difference is the hidden id and, when editing, the
 * picture already on file showing in the drop zone.
 */
export type PromoDraft = {
  id: number;
  titleDe: string;
  titleEn: string;
  titleVi: string;
  bodyDe: string;
  bodyEn: string;
  bodyVi: string;
  /** Berlin wall clock, as `<input type="datetime-local">` wants it. */
  startsAt: string;
  endsAt: string;
  sort: number;
  published: boolean;
  imagePath: string | null;
};

const ERRORS: Record<string, string> = {
  forbidden: 'Nicht angemeldet. Bitte neu anmelden.',
  invalid: 'Bitte einen deutschen Titel (mind. 2 Zeichen) und gültige Daten angeben.',
  dates: 'Das Ende liegt vor dem Beginn — so läuft die Aktion nie.',
  type: 'Nur JPG, PNG oder WebP.',
  size: 'Das Bild ist größer als 6 MB.',
  unreadable: 'Die Datei konnte nicht gelesen werden.',
};

export function PromoEditor({ draft, onClose }: { draft: PromoDraft | null; onClose: () => void }) {
  const [state, action, pending] = useActionState<PromoState, FormData>(savePromotionAction, {
    status: 'idle',
  });
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<PromoState | null>(null);

  /*
   * A new offer that stays on screen with its fields still filled in is an
   * invitation to press Speichern twice and end up with two of it. An edit
   * keeps its values — that is what the person is looking at.
   */
  useEffect(() => {
    if (state.status !== 'saved' || handled.current === state) return;
    handled.current = state;
    if (draft) return;
    formRef.current?.reset();
    setPreview(null);
  }, [state, draft]);

  const field = (name: keyof PromoDraft) => `promo-${draft ? draft.id : 'neu'}-${name}`;
  const shown = preview ?? draft?.imagePath ?? null;

  return (
    <form ref={formRef} action={action} className={styles.promoForm}>
      {draft ? <input type="hidden" name="id" value={draft.id} /> : null}

      <div className={styles.promoHead}>
        <label className={styles.promoDrop} htmlFor={field('imagePath')}>
          {shown ? (
            <img src={shown} alt="" className={styles.promoPreview} />
          ) : (
            <span className={styles.promoDropText}>Bild wählen — JPG, PNG oder WebP, max. 6 MB</span>
          )}
        </label>
        <input
          id={field('imagePath')}
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          className="visually-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />

        <div className={styles.promoHeadFields}>
          <div className="field">
            <label htmlFor={field('titleDe')}>Titel (DE) *</label>
            <input
              id={field('titleDe')}
              name="titleDe"
              className="input"
              maxLength={120}
              defaultValue={draft?.titleDe ?? ''}
              required
            />
          </div>
          <div className={styles.promoPair}>
            <div className="field">
              <label htmlFor={field('titleEn')}>Title (EN)</label>
              <input
                id={field('titleEn')}
                name="titleEn"
                className="input"
                maxLength={120}
                defaultValue={draft?.titleEn ?? ''}
              />
            </div>
            <div className="field">
              <label htmlFor={field('titleVi')}>Tiêu đề (VI)</label>
              <input
                id={field('titleVi')}
                name="titleVi"
                className="input"
                maxLength={120}
                defaultValue={draft?.titleVi ?? ''}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor={field('bodyDe')}>Text (DE)</label>
        <textarea
          id={field('bodyDe')}
          name="bodyDe"
          className="textarea"
          maxLength={1200}
          defaultValue={draft?.bodyDe ?? ''}
        />
      </div>

      <div className={styles.promoPair}>
        <div className="field">
          <label htmlFor={field('bodyEn')}>Text (EN)</label>
          <textarea
            id={field('bodyEn')}
            name="bodyEn"
            className="textarea"
            maxLength={1200}
            defaultValue={draft?.bodyEn ?? ''}
          />
        </div>
        <div className="field">
          <label htmlFor={field('bodyVi')}>Nội dung (VI)</label>
          <textarea
            id={field('bodyVi')}
            name="bodyVi"
            className="textarea"
            maxLength={1200}
            defaultValue={draft?.bodyVi ?? ''}
          />
        </div>
      </div>

      <div className={styles.promoGrid}>
        <div className="field">
          <label htmlFor={field('startsAt')}>Läuft ab</label>
          <input
            id={field('startsAt')}
            name="startsAt"
            type="datetime-local"
            className="input"
            defaultValue={draft?.startsAt ?? ''}
          />
          <p className="field-hint">Leer = ab sofort. Zeiten sind Berliner Zeit.</p>
        </div>
        <div className="field">
          <label htmlFor={field('endsAt')}>Läuft bis</label>
          <input
            id={field('endsAt')}
            name="endsAt"
            type="datetime-local"
            className="input"
            defaultValue={draft?.endsAt ?? ''}
          />
          <p className="field-hint">Nach diesem Zeitpunkt verschwindet die Aktion von der Website.</p>
        </div>
        <div className="field">
          <label htmlFor={field('sort')}>Reihenfolge</label>
          <input
            id={field('sort')}
            name="sort"
            type="number"
            min={0}
            max={9999}
            className="input"
            defaultValue={draft?.sort ?? 0}
          />
          <p className="field-hint">Kleinere Zahl steht weiter oben.</p>
        </div>
      </div>

      <label className={styles.promoCheck}>
        <input type="checkbox" name="published" defaultChecked={draft ? draft.published : true} />
        <span>Veröffentlicht — auf der Website sichtbar, sobald die Laufzeit begonnen hat</span>
      </label>

      {state.status === 'error' ? (
        <p className={styles.error} role="alert">
          {ERRORS[state.message] ?? ERRORS.invalid}
        </p>
      ) : null}
      {state.status === 'saved' ? (
        <p className={styles.ok} role="status">
          „{state.title}“ gespeichert.
        </p>
      ) : null}

      <div className={styles.promoFormActions}>
        <button type="submit" className="btn btn--gold btn--sm" disabled={pending}>
          {pending ? 'Wird gespeichert …' : draft ? 'Änderungen speichern' : 'Aktion anlegen'}
        </button>
        <button type="button" className="btn btn--sm" onClick={onClose}>
          {draft ? 'Schließen' : 'Abbrechen'}
        </button>
      </div>
    </form>
  );
}
