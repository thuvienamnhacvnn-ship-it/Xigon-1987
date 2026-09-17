'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import styles from './MenuBoard.module.css';
import { fill, type Dictionary } from '@/lib/dictionary';
import { formatMoney } from '@/lib/money';
import { hrefFor, type Locale } from '@/lib/i18n';
import { PRICE_NOTE } from '@/lib/price-note';
import type { MenuCategory, MenuDish } from '@/server/menu';

/** Three plates a page. The photographs are the point; six of them are wallpaper. */
const PER_PAGE = 3;

/**
 * The card.
 *
 * The screen has a fixed height — it is one screen of an app, not a document —
 * so the card pages instead of scrolling. Paging keeps every photograph at the
 * size it was chosen for, and keeps the filters and the page numbers on screen
 * at the same time, which a long scroll does not.
 *
 * Filtering and searching happen here, in the browser, against the same rows
 * the server sent. There is no second source of truth: prices, availability and
 * options are decided again on the server when something is added to a basket.
 */
export function MenuBoard({
  locale,
  dict,
  categories,
}: {
  locale: Locale;
  dict: Dictionary;
  categories: MenuCategory[];
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const all = useMemo(() => categories.flatMap((entry) => entry.dishes), [categories]);

  const found = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return all.filter((dish) => {
      if (category && dish.categorySlug !== category) return false;
      if (!needle) return true;
      return [dish.name, dish.code, dish.description, dish.ingredients]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [all, category, query]);

  const pages = Math.max(1, Math.ceil(found.length / PER_PAGE));
  // A filter can shrink the list under the current page; clamp rather than
  // showing an empty page the guest has to click their way out of.
  const current = Math.min(page, pages - 1);
  const shown = found.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  function choose(slug: string | null) {
    setCategory(slug);
    setPage(0);
  }

  return (
    <div className={styles.board}>
      {/* ---------- filters ---------- */}
      <div className={styles.controls}>
        <div className={styles.tabs} role="group" aria-label={dict.menu.categories}>
          <button type="button" className={styles.tab} aria-pressed={category === null} onClick={() => choose(null)}>
            {dict.menu.all}
          </button>
          {categories.map((entry) => (
            <button
              key={entry.slug}
              type="button"
              className={styles.tab}
              aria-pressed={category === entry.slug}
              onClick={() => choose(entry.slug)}
            >
              {entry.name}
            </button>
          ))}
        </div>

        <label className={styles.search}>
          <span className="visually-hidden">{dict.menu.search}</span>
          <SearchIcon />
          <input
            type="search"
            value={query}
            placeholder={dict.menu.search}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>

      {/*
       * The two standing caveats, once, where a price is about to be read.
       * They are not decoration: the prices in this database are demo prices,
       * and no allergen data has ever been supplied by the restaurant.
       */}
      <p className={styles.caveat}>
        {PRICE_NOTE[locale]} · {dict.menu.crossContact}
      </p>

      {/* ---------- the plates ---------- */}
      {shown.length ? (
        <ul className={styles.grid}>
          {shown.map((dish) => (
            <DishCard key={dish.id} locale={locale} dict={dict} dish={dish} />
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{dict.menu.emptyTitle}</p>
          <p className={styles.emptyText}>{dict.menu.emptyText}</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setQuery('');
              choose(null);
            }}
          >
            {dict.menu.reset}
          </button>
        </div>
      )}

      {/* ---------- page numbers ---------- */}
      <nav className={styles.pager} aria-label={fill(dict.menu.pageOf, { n: current + 1, total: pages })}>
        <button
          type="button"
          className={styles.step}
          onClick={() => setPage(current - 1)}
          disabled={current === 0}
          aria-label={dict.menu.prevPage}
        >
          ‹
        </button>

        <ol className={styles.numbers}>
          {Array.from({ length: pages }, (_, index) => (
            <li key={index}>
              <button
                type="button"
                className={styles.number}
                aria-current={index === current ? 'page' : undefined}
                aria-label={fill(dict.menu.goToPage, { n: index + 1 })}
                onClick={() => setPage(index)}
              >
                {index + 1}
              </button>
            </li>
          ))}
        </ol>

        <button
          type="button"
          className={styles.step}
          onClick={() => setPage(current + 1)}
          disabled={current >= pages - 1}
          aria-label={dict.menu.nextPage}
        >
          ›
        </button>

        <span className={styles.count}>
          {found.length === 0
            ? dict.menu.resultsNone
            : found.length === 1
              ? dict.menu.resultsOne
              : fill(dict.menu.results, { n: found.length })}
        </span>
      </nav>
    </div>
  );
}

function DishCard({ locale, dict, dish }: { locale: Locale; dict: Dictionary; dish: MenuDish }) {
  const href = hrefFor(locale, 'dish', { slug: dish.slug });

  return (
    <li className={styles.card} data-sold-out={dish.soldOut ? 'true' : undefined}>
      <Link href={href} className={styles.photo}>
        {dish.photoId ? (
          <img
            src={`/img/dish/${dish.photoId}-720.webp`}
            srcSet={`/img/dish/${dish.photoId}-480.webp 480w, /img/dish/${dish.photoId}-720.webp 720w, /img/dish/${dish.photoId}-1080.webp 1080w`}
            sizes="(max-width: 720px) 90vw, 30vw"
            alt={dish.name}
            loading="lazy"
            decoding="async"
            width={720}
            height={540}
          />
        ) : (
          /*
           * Not every dish on the card has been photographed yet. An honest
           * empty frame is better than borrowing another dish's picture, which
           * is what a guest would take it for.
           */
          <span className={styles.noPhoto}>
            <span>{dict.menu.photoPending}</span>
          </span>
        )}

        {dish.soldOut ? <span className={styles.soldOut}>{dict.menu.soldOut}</span> : null}
      </Link>

      <div className={styles.body}>
        <p className={styles.category}>{dish.categoryName}</p>
        <h3 className={styles.name}>
          <Link href={href}>
            {dish.code ? <span className={styles.code}>{dish.code}</span> : null}
            {dish.name}
          </Link>
        </h3>

        {dish.description ? <p className={styles.text}>{dish.description}</p> : null}

        <div className={styles.tags}>
          {dish.vegan ? <span className={styles.tag}>{dict.menu.vegan}</span> : null}
          {!dish.vegan && dish.vegetarian ? <span className={styles.tag}>{dict.menu.vegetarian}</span> : null}
          {dish.spice > 0 ? (
            <span className={styles.tag} aria-label={`${dict.menu.spice} ${dish.spice}/3`}>
              {'🌶'.repeat(dish.spice)}
            </span>
          ) : null}
        </div>

        <div className={styles.foot}>
          <p className={styles.price}>
            {dish.fromCents === null ? (
              '—'
            ) : (
              <>
                {dish.variants.length > 1 ? <span className={styles.from}>{dict.menu.from} </span> : null}
                {formatMoney(dish.fromCents, locale)}
              </>
            )}
          </p>
          <Link href={href} className="btn btn--gold">
            {dict.menu.details}
          </Link>
        </div>
      </div>
    </li>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.6" cy="8.6" r="5.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="m12.7 12.7 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
