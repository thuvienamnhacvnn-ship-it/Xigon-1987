'use client';

import { useState } from 'react';
import styles from './Admin.module.css';
import { PromoEditor } from './PromoEditor';

/**
 * Starting a new offer.
 *
 * Folded away until asked for: the list of what is already running is the thing
 * this screen is usually opened for, and an empty form at the top pushes it off
 * the first screenful.
 */
export function NewPromo() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className={styles.newBar}>
        <button type="button" className="btn btn--sm" onClick={() => setOpen(true)}>
          + Aktion anlegen
        </button>
      </div>
    );
  }

  return <PromoEditor draft={null} onClose={() => setOpen(false)} />;
}
