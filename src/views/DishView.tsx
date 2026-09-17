import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHead } from './PageHead';
import styles from './DishView.module.css';
import viewStyles from './Views.module.css';
import { Dish, Plate, Scene } from '@/components/Picture';
import { DishOrder } from '@/components/DishOrder';
import { DishCard } from '@/components/DishCard';
import { getDish, getRelated } from '@/server/menu';
import { PRICE_NOTE } from '@/lib/price-note';
import { formatMoney } from '@/lib/money';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * One dish, in full.
 *
 * This is where the brief's "click through for everything about the dish"
 * lands: the photograph large, the description, the ingredients, the portion
 * choices with their prices, and — the part most menus skip — a straight answer
 * about allergens, including when the answer is "we have not been told".
 */
export async function DishView({
  locale,
  dict,
  slug,
}: {
  locale: Locale;
  dict: Dictionary;
  slug: string;
}) {
  const dish = await getDish(locale, slug);
  if (!dish) notFound();

  const related = await getRelated(locale, dish, 3);

  return (
    <>
      <PageHead
        label={dish.categoryName}
        title={dish.name}
        back={{ href: hrefFor(locale, 'menu'), label: dict.menu.back }}
      />

      <article className={`section ${viewStyles.plain}`}>
        <div className="shell">
          <div className={styles.layout}>
            {/* ------------------------------------------------ picture -- */}
            <div className={styles.media}>
              {/*
               * The photograph first, then the cut-out.
               *
               * Nearly every dish has a photograph and only a handful were ever
               * cut out on transparency, so asking for the cut-out first meant
               * most dishes opened onto an empty frame with their code in it —
               * while the same dish showed its picture on the card the guest
               * had just tapped.
               */}
              {dish.photoId ? (
                <Dish
                  id={dish.photoId}
                  alt={dish.name}
                  sizes="(min-width: 900px) 46vw, 92vw"
                  className={styles.photo}
                  priority
                />
              ) : dish.plateId ? (
                <>
                  <span className={styles.glow} aria-hidden="true" />
                  <Plate
                    id={dish.plateId}
                    alt={dish.name}
                    sizes="(min-width: 900px) 46vw, 92vw"
                    className={styles.plate}
                    priority
                  />
                </>
              ) : dish.sceneId ? (
                <Scene id={dish.sceneId} alt={dish.name} sizes="(min-width: 900px) 46vw, 92vw" className={styles.scene} priority />
              ) : (
                <span className={styles.noPhoto}>
                  <span className={styles.noPhotoMark}>{dish.code ?? dish.name.slice(0, 1)}</span>
                </span>
              )}
            </div>

            {/* ------------------------------------------------- details -- */}
            <div className={styles.body}>
              {dish.code ? <p className={styles.code}>{dish.code}</p> : null}

              {dish.description ? <p className={styles.lede}>{dish.description}</p> : null}

              <ul className={styles.badges}>
                {dish.vegan ? <li>{dict.menu.vegan}</li> : null}
                {dish.vegetarian && !dish.vegan ? <li>{dict.menu.vegetarian}</li> : null}
                {dish.spice > 0 ? (
                  <li>
                    {dict.menu.spice} {'•'.repeat(dish.spice)}
                  </li>
                ) : null}
                {dish.soldOut ? <li className={styles.badgeWarn}>{dict.menu.soldOut}</li> : null}
              </ul>

              {dish.ingredients ? (
                <section className={styles.block}>
                  <h2 className={styles.blockTitle}>{dict.menu.ingredients}</h2>
                  <p>{dish.ingredients}</p>
                </section>
              ) : null}

              <section className={styles.block}>
                <h2 className={styles.blockTitle}>{dict.menu.allergens}</h2>
                {/*
                 * No allergen list has ever been supplied for this menu. An
                 * empty list is printed as "ask us", never as "contains
                 * nothing" — that difference is somebody's afternoon in A&E.
                 */}
                <p>{dish.allergensConfirmed && dish.allergens.length ? dish.allergens.join(', ') : dict.menu.allergensUnknown}</p>
                <p className={styles.small}>{dict.menu.crossContact}</p>
              </section>

              <section className={styles.block}>
                <h2 className={styles.blockTitle}>{dict.menu.portion}</h2>
                <ul className={styles.variants}>
                  {dish.variants.map((variant) => (
                    <li key={variant.id}>
                      <span>{variant.label}</span>
                      <span className={styles.variantPrice}>{formatMoney(variant.priceCents, locale)}</span>
                    </li>
                  ))}
                </ul>
                <p className={styles.small}>{PRICE_NOTE[locale]}</p>
              </section>

              <DishOrder
                locale={locale}
                dict={dict}
                dishId={dish.id}
                variants={dish.variants}
                soldOut={dish.soldOut}
                sourceNote={dish.sourceNote}
              />
            </div>
          </div>

          {related.length ? (
            <section className={styles.related}>
              <h2 className={styles.relatedTitle}>{dict.menu.related}</h2>
              <div className={styles.relatedGrid}>
                {related.map((entry) => (
                  <DishCard key={entry.id} dish={entry} locale={locale} dict={dict} variant="feature" />
                ))}
              </div>
              <Link href={hrefFor(locale, 'menu')} className="linkArrow">
                {dict.menu.back}
              </Link>
            </section>
          ) : null}
        </div>
      </article>
    </>
  );
}
