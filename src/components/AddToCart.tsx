'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AddToCart.module.css';
import { addToCartAction, type AddState } from '@/server/actions';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';

/**
 * The button that puts a dish in the basket.
 *
 * A real form posting to a server action, so it works before the JavaScript
 * arrives and still gives instant feedback after it does. The reply carries the
 * new item count, which is what refreshes the badge in the header.
 */
export function AddToCart({
  locale,
  dict,
  dishId,
  variantId,
  quantity = 1,
  note,
  compact = false,
  block = false,
  label,
}: {
  locale: Locale;
  dict: Dictionary;
  dishId: number;
  variantId: number;
  quantity?: number;
  note?: string | null;
  compact?: boolean;
  block?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AddState, FormData>(addToCartAction, { status: 'idle' });
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (state.status !== 'added') return;
    setFlash(true);
    // The header badge is rendered on the server from the count cookie, so the
    // route has to be refreshed for it to catch up.
    router.refresh();
    const timer = setTimeout(() => setFlash(false), 2200);
    return () => clearTimeout(timer);
  }, [state, router]);

  const failed = state.status === 'error';

  return (
    <form action={action} className={block ? styles.block : undefined}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="dishId" value={dishId} />
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value={quantity} />
      {note ? <input type="hidden" name="note" value={note} /> : null}

      <button
        type="submit"
        disabled={pending}
        className={`btn ${compact ? 'btn--sm' : 'btn--gold'} ${block ? 'btn--block' : ''} ${styles.button}`}
        data-state={flash ? 'added' : undefined}
      >
        {pending ? dict.common.loading : flash ? dict.cart.title : (label ?? dict.menu.add)}
        {flash ? <Check /> : null}
      </button>

      {failed ? (
        <p className={styles.error} role="alert">
          {state.reason === 'sold_out'
            ? dict.menu.soldOut
            : state.reason === 'not_orderable'
              ? dict.dish.notOnline
              : dict.common.error}
        </p>
      ) : null}
    </form>
  );
}

function Check() {
  return (
    <svg width="15" height="12" viewBox="0 0 15 12" fill="none" aria-hidden="true">
      <path d="M1 6.2 5.1 10.4 14 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
