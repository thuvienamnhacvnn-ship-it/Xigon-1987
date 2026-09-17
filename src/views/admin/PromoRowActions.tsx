'use client';

import { useState } from 'react';
import styles from './Admin.module.css';
import { PromoEditor, type PromoDraft } from './PromoEditor';
import { deletePromotionAction, reorderPromotionAction, togglePromotionAction } from '@/server/promo-actions';

/**
 * What can be done to one offer.
 *
 * Deleting asks first, and it is the only one of these that cannot be undone —
 * publishing and reordering are a second click away from where they were. The
 * editor opens underneath the row it belongs to rather than in a panel of its
 * own, so it is never ambiguous which offer is being changed.
 */
export function PromoRowActions({
  draft,
  first,
  last,
}: {
  draft: PromoDraft;
  first: boolean;
  last: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);

  return (
    <>
      <div className={styles.promoActions}>
        <form action={reorderPromotionAction}>
          <input type="hidden" name="id" value={draft.id} />
          <input type="hidden" name="direction" value="up" />
          <button type="submit" className={styles.small} disabled={first} aria-label="Nach oben">
            ↑
          </button>
        </form>
        <form action={reorderPromotionAction}>
          <input type="hidden" name="id" value={draft.id} />
          <input type="hidden" name="direction" value="down" />
          <button type="submit" className={styles.small} disabled={last} aria-label="Nach unten">
            ↓
          </button>
        </form>

        <form action={togglePromotionAction}>
          <input type="hidden" name="id" value={draft.id} />
          <input type="hidden" name="published" value={String(!draft.published)} />
          <button type="submit" className={styles.small}>
            {draft.published ? 'Ausblenden' : 'Veröffentlichen'}
          </button>
        </form>

        <button type="button" className={styles.small} onClick={() => setEditing((open) => !open)}>
          {editing ? 'Bearbeiten beenden' : 'Bearbeiten'}
        </button>

        <button type="button" className={styles.smallDanger} onClick={() => setAsking((open) => !open)}>
          Löschen
        </button>
      </div>

      {asking ? (
        <form action={deletePromotionAction} className={styles.confirm}>
          <input type="hidden" name="id" value={draft.id} />
          <span>„{draft.titleDe}“ wirklich löschen? Das lässt sich nicht rückgängig machen.</span>
          <button type="submit" className={styles.smallDanger}>
            Ja, löschen
          </button>
          <button type="button" className={styles.small} onClick={() => setAsking(false)}>
            Zurück
          </button>
        </form>
      ) : null}

      {editing ? <PromoEditor draft={draft} onClose={() => setEditing(false)} /> : null}
    </>
  );
}
