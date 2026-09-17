'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import styles from './Admin.module.css';
import { PromoMediaList, type MediaItem, storedItem } from './PromoMediaList';
import { savePromotionAction, type PromoState } from '@/server/promo-actions';
import { IMAGE_MAX_MB, MEDIA_MAX_ITEMS, VIDEO_MAX_MB } from '@/lib/media-limits';
import type { PromoMedia } from '@/db/schema';

/**
 * One offer, in full.
 *
 * The same form writes a new offer and edits an existing one — an edit screen
 * that differs from the create screen is an edit screen where a field quietly
 * goes missing. The only difference is the hidden id and, when editing, the
 * files already on the offer showing in the list.
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
  media: PromoMedia[];
};

const ERRORS: Record<string, string> = {
  forbidden: 'Nicht angemeldet. Bitte neu anmelden.',
  invalid: 'Bitte einen deutschen Titel (mind. 2 Zeichen) und gültige Daten angeben.',
  dates: 'Das Ende liegt vor dem Beginn — so läuft die Aktion nie.',
  'too-many': `Höchstens ${MEDIA_MAX_ITEMS} Dateien pro Aktion.`,
  type: 'Nicht unterstützt. Bilder als JPG, PNG oder WebP, Videos als MP4 oder WebM.',
  mismatch: 'Inhalt und Dateiendung passen nicht zusammen — die Datei ist nicht das, was ihr Name sagt.',
  'image-size': `Ein Bild ist zu groß. Bilder dürfen höchstens ${IMAGE_MAX_MB} MB haben.`,
  'video-size': `Ein Video ist zu groß. Videos dürfen höchstens ${VIDEO_MAX_MB} MB haben — strenger als Bilder, weil der Clip bei jedem Gast mitlädt.`,
  unreadable: 'Die Datei konnte nicht gelesen werden.',
};

export function PromoEditor({ draft, onClose }: { draft: PromoDraft | null; onClose: () => void }) {
  const [state, action, pending] = useActionState<PromoState, FormData>(savePromotionAction, {
    status: 'idle',
  });
  const [items, setItems] = useState<MediaItem[]>(() => (draft?.media ?? []).map(storedItem));
  const formRef = useRef<HTMLFormElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
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
    setItems([]);
  }, [state, draft]);

  /*
   * The running order, and the files that go with it.
   *
   * Files already on the offer travel as their path, so editing a caption does
   * not re-upload four photographs. New ones travel by position in a second,
   * hidden file input whose contents are assembled below — a clip's poster
   * frame rides along as an ordinary file the server checks like any other.
   */
  const plan = useMemo(() => {
    const files: File[] = [];
    const order = items.map((item) => {
      if (item.source === 'stored') return { keep: item.media.path };
      const slot = files.push(item.file) - 1;
      if (!item.poster) return { slot };
      return { slot, poster: files.push(item.poster) - 1 };
    });
    return { files, order };
  }, [items]);

  /*
   * A file input's contents cannot be set from a string, so the list is loaded
   * into it as real files. This is the one place the DOM is written to
   * directly: React has no controlled form of `files`.
   */
  useEffect(() => {
    const input = filesRef.current;
    if (!input) return;
    const transfer = new DataTransfer();
    for (const file of plan.files) transfer.items.add(file);
    input.files = transfer.files;
  }, [plan]);

  const field = (name: string) => `promo-${draft ? draft.id : 'neu'}-${name}`;

  return (
    <form ref={formRef} action={action} className={styles.promoForm}>
      {draft ? <input type="hidden" name="id" value={draft.id} /> : null}

      <PromoMediaList items={items} onChange={setItems} idPrefix={field('media')} />
      <input type="hidden" name="mediaOrder" value={JSON.stringify(plan.order)} />
      <input ref={filesRef} type="file" name="mediaFiles" multiple className="visually-hidden" tabIndex={-1} />

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
