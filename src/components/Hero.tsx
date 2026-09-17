'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from './Hero.module.css';
import { Plate, Scene } from './Picture';
import type { Dictionary } from '@/lib/dictionary';
import { hrefFor, type Locale } from '@/lib/i18n';

/**
 * A dish that can appear on the banner.
 *
 * `plateId` points at a transparent cut-out in /img/plate. Swapping the banner
 * dish means changing this list — nothing about the room, the table or the
 * lighting moves.
 */
export type HeroDish = {
  plateId: string;
  name: string;
  alt: string;
  slug?: string;
};

type Props = {
  locale: Locale;
  dict: Dictionary;
  dishes: HeroDish[];
  sceneAlt: string;
};

/**
 * The banner, built as a stack of layers rather than one picture.
 *
 *   0  the room        a photograph of the restaurant, graded into the green
 *   1  the table       cut out of its background by the asset build
 *   2  the dish        a transparent cut-out that changes; this is the only
 *                      layer that moves, which is the whole point of the stack
 *
 * Everything above that — the headline, the buttons, the dish switcher — is
 * ordinary markup sitting on top, so it stays selectable, translatable and
 * reachable by keyboard.
 */
export function Hero({ locale, dict, dishes, sceneAlt }: Props) {
  const [index, setIndex] = useState(0);
  const next = useCallback(() => setIndex((i) => (i + 1) % Math.max(dishes.length, 1)), [dishes.length]);

  // Slow rotation so the banner shows the range of the kitchen. Stops for
  // anyone who asked for reduced motion, and never runs with a single dish.
  useEffect(() => {
    if (dishes.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [next, dishes.length]);

  const active = dishes[index];

  return (
    <section className={styles.hero} id="hero">
      {/* ------------------------------ layer 0: the room ------------------ */}
      <div className={styles.stage} aria-hidden="true">
        <Scene id="hall-wide" alt="" sizes="100vw" className={styles.room} priority />
        <span className={styles.wash} />

        {/*
          * ---------------------------- layers 1 and 2 ---------------------
          *
          * The table and the dish share one box. That is what keeps the dish
          * in the middle of the table at every screen size: it is placed
          * against the table's own edges, not against the banner's, so the two
          * cannot drift apart when the window changes shape.
          */}
        <div className={styles.setting}>
          <img
            src="/img/layer/table-1400.webp"
            alt=""
            width={1400}
            height={746}
            className={styles.table}
            fetchPriority="high"
          />

          {active ? (
            <div className={styles.dish} key={active.plateId}>
              <span className={styles.dishGlow} />
              <span className={styles.dishShadow} />
              <Plate
                id={active.plateId}
                alt=""
                sizes="(min-width: 1100px) 36vw, 60vw"
                className={styles.dishImg}
                priority={index === 0}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* The dish is decoration on the banner, but it is also information, so
          its name is announced rather than left to the picture alone. */}
      <p className="visually-hidden">{sceneAlt}</p>

      {/* ------------------------------ copy ------------------------------- */}
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{dict.hero.eyebrow}</p>
        <h1 className={styles.headline}>{dict.hero.headline}</h1>
        <p className={styles.lede}>{dict.hero.lede}</p>
        <hr className={`rule ${styles.copyRule}`} />
      </div>

      {/* ------------------------------ foot ------------------------------- */}
      {/* The buttons and the dish switcher share one block, so the banner has a
          single bottom margin whether or not there is a dish to switch. */}
      <div className={styles.foot}>
        <div className={styles.actions}>
          <Link href={hrefFor(locale, 'menu')} className="btn btn--gold btn--spread">
            <Lines />
            <span>{dict.nav.menu}</span>
            <Arrow />
          </Link>
          <Link href={hrefFor(locale, 'reserve')} className="btn btn--spread">
            <CalendarIcon />
            <span>{dict.nav.reserve}</span>
            <Arrow />
          </Link>
          <Link href={hrefFor(locale, 'order')} className="btn btn--spread">
            <BagIcon />
            <span>{dict.hero.ctaOrder}</span>
            <Arrow />
          </Link>
        </div>

        {/* ---------------------------- dish switcher --------------------- */}
        {dishes.length > 1 ? (
          <div className={styles.switcher} role="group" aria-label={dict.hero.plateSwitch}>
            <span className={styles.switchLabel}>{active?.name}</span>
            {dishes.map((dish, i) => (
              <button
                key={dish.plateId}
                type="button"
                className={styles.dot}
                aria-current={i === index}
                aria-label={dish.name}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* ------------------------------ right edge ------------------------- */}
      <p className={styles.aside}>
        {dict.hero.aside}
        <span className={styles.asideRule} />
      </p>
    </section>
  );
}

function Arrow() {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" fill="none" aria-hidden="true">
      <path d="M0 5h20M16 1l4 4-4 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Lines() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
      <path d="M0 1h18M0 7h18M0 13h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="4" width="15" height="13.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 8h15M6.5 2v4M13.5 2v4M10 11v4M8 13h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 6h12l-1 12H5L4 6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7 6a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
