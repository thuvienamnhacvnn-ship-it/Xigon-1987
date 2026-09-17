'use client';

import { useState } from 'react';
import styles from './DishOrder.module.css';
import { AddToCart } from './AddToCart';
import { formatMoney } from '@/lib/money';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';
import type { MenuVariant } from '@/server/menu';

/**
 * Choosing a portion, a quantity and a note, then adding it.
 *
 * The note is passed straight to the kitchen and never changes the price —
 * which the hint says out loud, because "no coriander" should not quietly cost
 * anything and the guest should not have to wonder.
 */
export function DishOrder({
  locale,
  dict,
  dishId,
  variants,
  soldOut,
  sourceNote,
}: {
  locale: Locale;
  dict: Dictionary;
  dishId: number;
  variants: MenuVariant[];
  soldOut: boolean;
  sourceNote: string | null;
}) {
  const initial = variants.find((variant) => variant.isDefault) ?? variants[0];
  const [variantId, setVariantId] = useState<number | undefined>(initial?.id);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  const variant = variants.find((entry) => entry.id === variantId) ?? initial;
  const orderable = Boolean(variant?.orderable) && !soldOut;

  return (
    <div className={styles.order}>
      {variants.length > 1 ? (
        <fieldset className={styles.choice}>
          <legend className={styles.legend}>{dict.dish.choose}</legend>
          <div className={styles.options}>
            {variants.map((entry) => (
              <label key={entry.id} className={styles.option} data-active={entry.id === variantId}>
                <input
                  type="radio"
                  name="variant"
                  value={entry.id}
                  checked={entry.id === variantId}
                  onChange={() => setVariantId(entry.id)}
                  className="visually-hidden"
                />
                <span className={styles.optionLabel}>{entry.label}</span>
                <span className={styles.optionPrice}>{formatMoney(entry.priceCents, locale)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {orderable ? (
        <>
          <div className={styles.quantityRow}>
            <span className={styles.legend}>{dict.dish.quantity}</span>
            <div className={styles.stepper}>
              <button
                type="button"
                aria-label={dict.dish.less}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                −
              </button>
              <output className={styles.count}>{quantity}</output>
              <button
                type="button"
                aria-label={dict.dish.more}
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
              >
                +
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="dish-note">{dict.dish.note}</label>
            <input
              id="dish-note"
              className="input"
              maxLength={240}
              placeholder={dict.dish.notePlaceholder}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <p className="field-hint">{dict.dish.noteHint}</p>
          </div>

          {variant ? (
            <div className={styles.submit}>
              <p className={styles.total}>
                <span className={styles.totalLabel}>{dict.dish.total}</span>
                <span className={styles.totalValue}>{formatMoney(variant.priceCents * quantity, locale)}</span>
              </p>
              <AddToCart
                locale={locale}
                dict={dict}
                dishId={dishId}
                variantId={variant.id}
                quantity={quantity}
                note={note || null}
                label={dict.dish.addToCart}
                block
              />
            </div>
          ) : null}
        </>
      ) : (
        <p className={styles.unavailable}>{soldOut ? dict.menu.soldOut : dict.dish.notOnline}</p>
      )}

      {sourceNote ? <p className={styles.source}>{sourceNote}</p> : null}
    </div>
  );
}
