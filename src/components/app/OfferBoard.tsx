'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './OfferBoard.module.css';
import { fill, type Dictionary } from '@/lib/dictionary';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Promotion } from '@/server/content';

const PER_PAGE = 3;

/**
 * Angebote.
 *
 * The title sits on the restaurant itself and the offers float under it as
 * three separate sheets of glass. There is no panel around them on purpose: a
 * frame around a frame is what made this screen read as a billboard, and the
 * dead space the drawing leaves above and below the row is what keeps the
 * photographs looking like photographs.
 */
export function OfferBoard({
  locale,
  dict,
  offers,
}: {
  locale: Locale;
  dict: Dictionary;
  offers: Promotion[];
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(offers.length / PER_PAGE));
  // A shorter list can leave the guest on a page that no longer exists; clamp
  // rather than showing an empty row they have to click their way out of.
  const current = Math.min(page, pages - 1);
  const shown = offers.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  return (
    <div className={styles.board}>
      <header className={styles.head}>
        <h1 className={styles.title}>{dict.promo.title}</h1>
        <p className={styles.subtitle}>{dict.promo.caveat}</p>
      </header>

      {shown.length ? (
        <ul className={styles.grid}>
          {shown.map((offer) => (
            <li key={offer.id} className={`glass ${styles.card}`}>
              {offer.imagePath ? (
                <img
                  className={styles.image}
                  src={offer.imagePath}
                  alt={offer.title}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                /* An honest empty frame. Borrowing another offer's picture is
                   what a guest would take for the offer itself. */
                <span className={styles.noImage} aria-hidden="true" />
              )}

              <div className={styles.body}>
                <h2 className={styles.name}>{offer.title}</h2>
                {offer.body ? <p className={styles.text}>{offer.body}</p> : null}

                {offer.endsAt ? <Countdown dict={dict} endsAt={offer.endsAt} /> : null}

                <Link href={hrefFor(locale, 'menu')} className={`ghost ${styles.action}`}>
                  {dict.menu.label}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.none}>{dict.promo.none}</p>
      )}

      {/*
       * Two arrows and a count, the same device the card uses. Nobody jumps to
       * page four of a list of offers; they turn pages until one appeals.
       */}
      <nav className={styles.pager} aria-label={fill(dict.menu.pageOf, { n: current + 1, total: pages })}>
        <button
          type="button"
          className={styles.step}
          onClick={() => setPage(current - 1)}
          disabled={current === 0}
          aria-label={dict.menu.prevPage}
        >
          ←
        </button>

        <span className={styles.pageCount} aria-hidden="true">
          {current + 1} / {pages}
        </span>

        <button
          type="button"
          className={styles.step}
          onClick={() => setPage(current + 1)}
          disabled={current >= pages - 1}
          aria-label={dict.menu.nextPage}
        >
          →
        </button>
      </nav>
    </div>
  );
}

/**
 * One line, because an offer with an end date and no visible clock is just a
 * sentence — and four stacked figures are a dashboard.
 *
 * The clock starts in an effect rather than rendering on the server: the
 * server's "now" and the guest's "now" are never the same, and a ticking number
 * painted during render is a guaranteed hydration mismatch.
 */
function Countdown({ dict, endsAt }: { dict: Dictionary; endsAt: Date }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  if (left === null) return null;

  const seconds = Math.floor(left / 1000);
  const parts = [
    { value: Math.floor(seconds / 86400), label: dict.promo.days },
    { value: Math.floor((seconds % 86400) / 3600), label: dict.promo.hours },
    { value: Math.floor((seconds % 3600) / 60), label: dict.promo.minutes },
    { value: seconds % 60, label: dict.promo.seconds },
  ];

  return (
    <p className={styles.clock}>
      <span className={styles.clockLabel}>{dict.promo.endsIn}</span>
      <span className={styles.clockValue}>
        {parts.map((part) => `${String(part.value).padStart(2, '0')} ${part.label}`).join(' · ')}
      </span>
    </p>
  );
}
