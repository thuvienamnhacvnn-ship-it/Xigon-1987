import Link from 'next/link';
import styles from './DishCard.module.css';
import { Plate, Scene } from './Picture';
import { AddToCart } from './AddToCart';
import { formatMoney } from '@/lib/money';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';
import type { MenuDish } from '@/server/menu';

/**
 * One dish in a list.
 *
 * Two shapes from the same data: `feature` for the handful the house puts
 * forward, `row` for the rest of the card. The rest of the card is deliberately
 * quieter — a photograph, the name, the price and a way in — because a page
 * where everything shouts has no signature dishes at all.
 */
export function DishCard({
  dish,
  locale,
  dict,
  variant = 'row',
  priority = false,
}: {
  dish: MenuDish;
  locale: Locale;
  dict: Dictionary;
  variant?: 'feature' | 'row';
  priority?: boolean;
}) {
  const href = hrefFor(locale, 'dish', { slug: dish.slug });
  const defaultVariant = dish.variants.find((entry) => entry.isDefault) ?? dish.variants[0];
  const orderable = Boolean(defaultVariant?.orderable) && !dish.soldOut;

  return (
    <article className={variant === 'feature' ? styles.feature : styles.row} data-reveal>
      <Link href={href} className={styles.media} tabIndex={-1} aria-hidden="true">
        {dish.plateId ? (
          <Plate
            id={dish.plateId}
            alt=""
            sizes={variant === 'feature' ? '(min-width: 900px) 30vw, 70vw' : '(min-width: 900px) 20vw, 40vw'}
            className={styles.plate}
            priority={priority}
          />
        ) : dish.sceneId ? (
          <Scene id={dish.sceneId} alt="" sizes="(min-width: 900px) 30vw, 70vw" className={styles.scene} />
        ) : (
          /*
           * Not every dish has been photographed. Rather than a stock picture
           * of someone else's food, the card draws a medallion with the number
           * from the paper menu — honest, and it still looks like the brand.
           */
          <span className={styles.blank}>
            <Medallion label={dish.code ?? dish.name.slice(0, 1).toUpperCase()} />
          </span>
        )}
        {dish.soldOut ? <span className={styles.soldOut}>{dict.menu.soldOut}</span> : null}
      </Link>

      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={styles.name}>
            {dish.code ? <span className={styles.code}>{dish.code}</span> : null}
            <Link href={href} className={styles.nameLink}>
              {dish.name}
            </Link>
          </h3>
          <p className={styles.price}>
            {dish.fromCents === null ? (
              <span className={styles.onRequest}>{dict.menu.details}</span>
            ) : (
              <>
                {dish.variants.length > 1 ? <span className={styles.from}>{dict.menu.from} </span> : null}
                {formatMoney(dish.fromCents, locale)}
              </>
            )}
          </p>
        </div>

        {dish.description ? <p className={styles.text}>{dish.description}</p> : null}

        <div className={styles.tags}>
          {dish.vegan ? <span className={styles.tag}>{dict.menu.vegan}</span> : null}
          {dish.vegetarian && !dish.vegan ? <span className={styles.tag}>{dict.menu.vegetarian}</span> : null}
          {dish.spice > 0 ? (
            <span className={styles.tag} aria-label={`${dict.menu.spice}: ${dish.spice}`}>
              {'•'.repeat(dish.spice)} {dict.menu.spice}
            </span>
          ) : null}
        </div>

        <div className={styles.actions}>
          <Link href={href} className="linkArrow">
            {dict.menu.details}
            <Arrow />
          </Link>
          {orderable && defaultVariant ? (
            <AddToCart
              locale={locale}
              dict={dict}
              dishId={dish.id}
              variantId={defaultVariant.id}
              compact
            />
          ) : dish.soldOut ? null : (
            <span className={styles.note}>{dict.menu.dineInOnly}</span>
          )}
        </div>
      </div>
    </article>
  );
}

function Medallion({ label }: { label: string }) {
  return (
    <span className={styles.medallion}>
      <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.5" />
        <circle cx="60" cy="60" r="45" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" />
        <path d="M60 8v12M60 100v12M8 60h12M100 60h12" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.5" />
        <path
          d="M60 26c6 6 9 12 9 18s-3 10-9 14c-6-4-9-8-9-14s3-12 9-18Z"
          stroke="currentColor"
          strokeWidth="0.7"
          strokeOpacity="0.35"
        />
      </svg>
      <span className={styles.medallionText}>{label}</span>
    </span>
  );
}

function Arrow() {
  return (
    <svg width="20" height="9" viewBox="0 0 22 10" fill="none" aria-hidden="true">
      <path d="M0 5h20M16 1l4 4-4 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
