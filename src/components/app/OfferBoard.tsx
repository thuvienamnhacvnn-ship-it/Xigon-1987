'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './OfferBoard.module.css';
import { fill, type Dictionary } from '@/lib/dictionary';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Promotion } from '@/server/content';

const PER_PAGE = 3;

/**
 * The offers, three to a page.
 *
 * Each card carries its own countdown, because an offer with an end date and no
 * visible clock is just a sentence. The clock is started in an effect rather
 * than rendered on the server: the server's "now" and the guest's "now" are
 * never the same, and a hydration mismatch on a ticking number is guaranteed.
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
  const current = Math.min(page, pages - 1);
  const shown = offers.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  return (
    <div className={styles.board}>
      <ul className={styles.grid}>
        {shown.map((offer) => (
          <li key={offer.id} className={styles.card}>
            {offer.imagePath ? (
              <img
                className={styles.image}
                src={offer.imagePath}
                alt={offer.title}
                width={offer.imageWidth ?? undefined}
                height={offer.imageHeight ?? undefined}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className={styles.noImage} aria-hidden="true" />
            )}

            <div className={styles.body}>
              <h3 className={styles.title}>{offer.title}</h3>
              {offer.body ? <p className={styles.text}>{offer.body}</p> : null}

              {offer.endsAt ? <Countdown dict={dict} endsAt={offer.endsAt} /> : null}

              <div className={styles.actions}>
                <Link href={hrefFor(locale, 'menu')} className="btn btn--gold">
                  {dict.menu.label}
                </Link>
                <Link href={hrefFor(locale, 'reserve')} className="btn">
                  {dict.nav.reserveShort}
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {pages > 1 ? (
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
        </nav>
      ) : null}
    </div>
  );
}

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
    <div className={styles.clock}>
      <span className={styles.clockLabel}>{dict.promo.endsIn}</span>
      <span className={styles.clockParts}>
        {parts.map((part) => (
          <span key={part.label} className={styles.clockPart}>
            <b>{String(part.value).padStart(2, '0')}</b>
            {part.label}
          </span>
        ))}
      </span>
    </div>
  );
}
