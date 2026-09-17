'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import styles from './MenuBrowser.module.css';
import { DishCard } from './DishCard';
import { fill, type Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';
import type { MenuCategory } from '@/server/menu';

/**
 * The full card.
 *
 * Filtering happens in the browser over the whole published menu, which is a
 * few dozen rows — a round trip per keystroke would be slower and would break
 * the moment the network hiccups. The server still decides what is published.
 */
export function MenuBrowser({
  categories,
  locale,
  dict,
}: {
  categories: MenuCategory[];
  locale: Locale;
  dict: Dictionary;
}) {
  const [active, setActive] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [dietary, setDietary] = useState<'all' | 'vegetarian' | 'vegan'>('all');
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const needle = deferred.trim().toLowerCase();

    return categories
      .filter((category) => active === 'all' || category.slug === active)
      .map((category) => ({
        ...category,
        dishes: category.dishes.filter((dish) => {
          if (dietary === 'vegan' && !dish.vegan) return false;
          if (dietary === 'vegetarian' && !dish.vegetarian) return false;
          if (!needle) return true;
          return (
            dish.name.toLowerCase().includes(needle) ||
            (dish.code ?? '').toLowerCase().includes(needle) ||
            (dish.description ?? '').toLowerCase().includes(needle) ||
            (dish.ingredients ?? '').toLowerCase().includes(needle)
          );
        }),
      }))
      .filter((category) => category.dishes.length > 0);
  }, [categories, active, deferred, dietary]);

  const total = filtered.reduce((sum, category) => sum + category.dishes.length, 0);
  const dirty = active !== 'all' || query.trim() !== '' || dietary !== 'all';

  return (
    <div className={styles.browser}>
      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <SearchIcon className={styles.searchIcon} />
          <label htmlFor="menu-search" className="visually-hidden">
            {dict.menu.search}
          </label>
          <input
            id="menu-search"
            type="search"
            className={`input ${styles.search}`}
            placeholder={dict.menu.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className={styles.chips} role="group" aria-label={dict.menu.categories}>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={active === 'all'}
            onClick={() => setActive('all')}
          >
            {dict.menu.all}
          </button>
          {categories.map((category) => (
            <button
              key={category.slug}
              type="button"
              className={styles.chip}
              aria-pressed={active === category.slug}
              onClick={() => setActive(category.slug)}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className={styles.chips} role="group" aria-label={dict.menu.vegetarian}>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={dietary === 'vegetarian'}
            onClick={() => setDietary((value) => (value === 'vegetarian' ? 'all' : 'vegetarian'))}
          >
            {dict.menu.vegetarian}
          </button>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={dietary === 'vegan'}
            onClick={() => setDietary((value) => (value === 'vegan' ? 'all' : 'vegan'))}
          >
            {dict.menu.vegan}
          </button>
        </div>
      </div>

      <div className={styles.status} role="status">
        <span>
          {total === 0 ? dict.menu.resultsNone : total === 1 ? dict.menu.resultsOne : fill(dict.menu.results, { n: total })}
        </span>
        {dirty ? (
          <button
            type="button"
            className={styles.reset}
            onClick={() => {
              setActive('all');
              setQuery('');
              setDietary('all');
            }}
          >
            {dict.menu.reset}
          </button>
        ) : null}
      </div>

      {total === 0 ? (
        <div className={styles.empty}>
          <h3>{dict.menu.emptyTitle}</h3>
          <p>{dict.menu.emptyText}</p>
        </div>
      ) : (
        filtered.map((category) => (
          <section key={category.id} className={styles.group} id={category.slug}>
            <header className={styles.groupHead}>
              <h2 className={styles.groupTitle}>{category.name}</h2>
              <hr className="rule" />
              {category.note ? <p className={styles.groupNote}>{category.note}</p> : null}
            </header>

            <div className={styles.list}>
              {category.dishes.map((dish) => (
                <DishCard key={dish.id} dish={dish} locale={locale} dict={dict} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
