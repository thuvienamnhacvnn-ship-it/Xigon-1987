'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './OfferBoard.module.css';
import { EdgeLight } from './EdgeLight';
import { OfferMedia } from './OfferMedia';
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
              <EdgeLight />
              <OfferMedia media={offer.media} alt={offer.title} />

              {/*
               * The corner label. It carries a day or a kind — never a
               * percentage and never a crossed-out price, because nothing on
               * this card has been priced by the restaurant. A discount nobody
               * agreed to is the one decoration that costs money at the till.
               */}
              {offer.badge ? <span className={styles.badge}>{offer.badge}</span> : null}

              <div className={styles.body}>
                <span className={styles.seal} aria-hidden="true">
                  <Seal />
                </span>

                <h2 className={styles.name}>{offer.title}</h2>
                {offer.body ? <p className={styles.text}>{offer.body}</p> : null}

                <p className={styles.runs}>
                  <CalendarIcon />
                  {runsFor(offer, locale, dict)}
                </p>

                <Countdown dict={dict} endsAt={offer.endsAt} startsAt={offer.startsAt} />

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
 * When the offer runs, in words a guest can act on.
 *
 * An offer with no dates runs until somebody takes it down, and saying "from
 * now" is truer than leaving the line blank — a card with no period on it is
 * the kind a guest turns up for three weeks late.
 */
function runsFor(
  offer: { startsAt: Date | null; endsAt: Date | null },
  locale: Locale,
  dict: Dictionary,
): string {
  const day = (value: Date) =>
    new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Berlin',
    }).format(new Date(value));

  if (offer.startsAt && offer.endsAt) return `${day(offer.startsAt)} – ${day(offer.endsAt)}`;
  if (offer.endsAt) return `${dict.promo.until} ${day(offer.endsAt)}`;
  if (offer.startsAt) return `${dict.promo.from} ${day(offer.startsAt)}`;
  return dict.promo.ongoing;
}

/** A small pressed seal, the way a printed card marks its own offers. */
function Seal() {
  return (
    <svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true">
      <circle cx="20" cy="20" r="18.4" fill="none" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M20 9c3.6 3.8 3.6 11.2 0 15-3.6-3.8-3.6-11.2 0-15Z" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <path d="M20 26.5v4M14 20h-4M30 20h-4" fill="none" stroke="currentColor" strokeWidth="0.6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="3.2" y="5" width="17.6" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.2 10h17.6M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
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
function Countdown({
  dict,
  endsAt,
  startsAt,
}: {
  dict: Dictionary;
  endsAt: Date | null;
  startsAt: Date | null;
}) {
  const [left, setLeft] = useState<number | null>(null);

  /*
   * Counts down to whichever moment is still ahead: to the start while the
   * offer has not opened, then to the end. An offer with neither runs until
   * somebody takes it down, and inventing a deadline for it — the usual trick
   * for making a card feel urgent — would be inventing a fact.
   */
  const target = endsAt ?? (startsAt && new Date(startsAt).getTime() > Date.now() ? startsAt : null);
  const counting = endsAt ? 'ends' : 'starts';

  useEffect(() => {
    if (!target) return;
    const at = new Date(target).getTime();
    const tick = () => setLeft(Math.max(0, at - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (!target || left === null) return null;

  const seconds = Math.floor(left / 1000);
  const parts = [
    { value: Math.floor(seconds / 86400), label: dict.promo.days },
    { value: Math.floor((seconds % 86400) / 3600), label: dict.promo.hours },
    { value: Math.floor((seconds % 3600) / 60), label: dict.promo.minutes },
    { value: seconds % 60, label: dict.promo.seconds },
  ];

  return (
    <p className={styles.clock}>
      <span className={styles.clockLabel}>{counting === 'ends' ? dict.promo.endsIn : dict.promo.startsIn}</span>
      <span className={styles.clockValue}>
        {parts.map((part) => `${String(part.value).padStart(2, '0')} ${part.label}`).join(' · ')}
      </span>
    </p>
  );
}
