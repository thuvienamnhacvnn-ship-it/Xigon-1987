import Link from 'next/link';
import styles from './Sections.module.css';
import { SectionHead } from './SectionHead';
import { DishCard } from './DishCard';
import { Scene } from './Picture';
import { BotanicalBranch } from './Botanical';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';
import type { MenuCategory, MenuDish } from '@/server/menu';
import type { Review } from '@/server/content';

/* ------------------------------------------------------------- signature -- */

/**
 * The four the house puts forward.
 *
 * These are the only dishes on the home page that get a full card; the rest of
 * the menu appears below as a photograph and a name. That is the difference the
 * brief asked for, and it is what makes "signature" mean anything.
 */
export function SignatureSection({
  dishes,
  locale,
  dict,
}: {
  dishes: MenuDish[];
  locale: Locale;
  dict: Dictionary;
}) {
  if (!dishes.length) return null;

  return (
    <section className={`section ${styles.signature}`} id="signature">
      <div className="shell">
        <SectionHead
          label={dict.signature.label}
          title={dict.signature.title}
          text={dict.signature.text}
          aside={
            <Link href={hrefFor(locale, 'menu')} className="btn">
              {dict.signature.cta}
            </Link>
          }
        />

        <div className={styles.featureGrid}>
          {dishes.map((dish, index) => (
            <DishCard
              key={dish.id}
              dish={dish}
              locale={locale}
              dict={dict}
              variant="feature"
              priority={index < 2}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ menu -- */

/**
 * The rest of the card, on the home page: every category with its dishes shown
 * small, so a guest can see the whole range without a second click, and the
 * full page is one link away.
 */
export function MenuTeaser({
  categories,
  locale,
  dict,
}: {
  categories: MenuCategory[];
  locale: Locale;
  dict: Dictionary;
}) {
  if (!categories.length) return null;

  return (
    <section className={`section on-cream ${styles.menu}`} id="menu">
      <div className="shell">
        <SectionHead
          label={dict.menu.label}
          title={dict.menu.title}
          text={dict.menu.intro}
          aside={
            <Link href={hrefFor(locale, 'menu')} className="btn btn--ink">
              {dict.signature.cta}
            </Link>
          }
        />

        <div className={styles.teaserGrid}>
          {categories.map((category) => (
            <section key={category.id} className={styles.teaserCol} data-reveal>
              <h3 className={styles.teaserTitle}>{category.name}</h3>
              {category.note ? <p className={styles.teaserNote}>{category.note}</p> : null}

              <ul className={styles.teaserList}>
                {category.dishes.slice(0, 4).map((dish) => (
                  <li key={dish.id}>
                    <Link href={hrefFor(locale, 'dish', { slug: dish.slug })} className={styles.teaserItem}>
                      <span className={styles.teaserThumb}>
                        {dish.plateId ? (
                          <img src={`/img/plate/${dish.plateId}-420.webp`} alt="" width={56} height={56} loading="lazy" />
                        ) : (
                          <span className={styles.teaserMark}>{dish.code ?? dish.name.slice(0, 1)}</span>
                        )}
                      </span>
                      <span className={styles.teaserName}>{dish.name}</span>
                      <span className={styles.teaserDot} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>

              <Link href={`${hrefFor(locale, 'menu')}#${category.slug}`} className={styles.teaserMore}>
                {dict.menu.details}
              </Link>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- space -- */

const SPACE_SCENES = ['dining-room', 'lanterns-bar', 'neon-logo-wall', 'cabinet-detail', 'interior-colour', 'sushi-bench'];

export function SpaceSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className={`section ${styles.space}`} id="space">
      <BotanicalBranch className={styles.spaceLeaf} />
      <div className="shell">
        <SectionHead
          label={dict.space.label}
          title={dict.space.title}
          text={dict.space.text}
          aside={
            <Link href={hrefFor(locale, 'restaurant')} className="btn">
              {dict.space.cta}
            </Link>
          }
        />

        <div className={styles.gallery}>
          {SPACE_SCENES.map((id, index) => (
            <figure key={id} className={styles.tile} data-reveal style={{ '--reveal-delay': `${index * 60}ms` } as React.CSSProperties}>
              <Scene
                id={id}
                alt=""
                sizes="(min-width: 1100px) 30vw, (min-width: 700px) 46vw, 90vw"
                className={styles.tileImg}
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- reviews -- */

export function ReviewsSection({ reviews, dict }: { reviews: Review[]; dict: Dictionary }) {
  return (
    <section className={`section on-cream ${styles.reviews}`} id="reviews">
      <div className="shell">
        <SectionHead label={dict.reviews.label} title={dict.reviews.title} align="center" />

        {reviews.length ? (
          <ul className={styles.reviewGrid}>
            {reviews.map((review) => (
              <li key={review.id} className={styles.review} data-reveal>
                <Quote />
                <p className={styles.reviewBody}>{review.body}</p>
                <p className={styles.reviewAuthor}>{review.author}</p>
                {review.source ? (
                  <p className={styles.reviewSource}>
                    {dict.reviews.source}:{' '}
                    {review.sourceUrl ? (
                      <a href={review.sourceUrl} target="_blank" rel="noreferrer noopener">
                        {review.source}
                      </a>
                    ) : (
                      review.source
                    )}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          /*
           * No quote is invented and none is copied off a review site: naming a
           * real guest on a commercial page needs their agreement. Until the
           * restaurant supplies quotes it may publish, the section says so.
           */
          <p className={styles.reviewsEmpty} data-reveal>
            {dict.reviews.none}
          </p>
        )}
      </div>
    </section>
  );
}

function Quote() {
  return (
    <svg className={styles.quoteMark} width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true">
      <path
        d="M13 2C7 4.5 3 9.5 3 15.2 3 20.6 6 24 10.3 24c3.4 0 5.9-2.4 5.9-5.6 0-3.1-2.2-5.3-5.2-5.3-.6 0-1.2.1-1.6.2.7-3.3 3.2-6.2 6.6-8L13 2ZM30.6 2c-6 2.5-10 7.5-10 13.2 0 5.4 3 8.8 7.3 8.8 3.4 0 5.9-2.4 5.9-5.6 0-3.1-2.2-5.3-5.2-5.3-.6 0-1.2.1-1.6.2.7-3.3 3.2-6.2 6.6-8L30.6 2Z"
        fill="currentColor"
      />
    </svg>
  );
}
