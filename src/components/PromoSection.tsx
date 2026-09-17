'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './PromoSection.module.css';
import { SectionHead } from './SectionHead';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';

export type PromoView = {
  id: number;
  slug: string;
  title: string;
  body: string | null;
  imagePath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  /** ISO string; the countdown is computed in the browser from this. */
  endsAt: string | null;
};

/**
 * What is running now.
 *
 * A client component only because of the countdown — the offers themselves are
 * rendered by the server, so an offer is visible with JavaScript switched off
 * and only the clock is missing.
 */
export function PromoSection({
  promotions,
  locale,
  dict,
  manageHref,
}: {
  promotions: PromoView[];
  locale: Locale;
  dict: Dictionary;
  manageHref: string;
}) {
  return (
    <section className={`section ${styles.promos}`} id="promo">
      <div className="shell">
        <SectionHead
          label={dict.promo.label}
          title={dict.promo.title}
          aside={
            <Link href={manageHref} className={styles.manage}>
              {dict.promo.manage}
            </Link>
          }
        />

        {promotions.length ? (
          <ul className={styles.grid}>
            {promotions.map((promotion, index) => (
              <li key={promotion.id} className={index === 0 ? styles.cardWide : styles.card} data-reveal>
                {promotion.imagePath ? (
                  <img
                    className={styles.image}
                    src={promotion.imagePath}
                    alt=""
                    width={promotion.imageWidth ?? 1280}
                    height={promotion.imageHeight ?? 720}
                    loading="lazy"
                  />
                ) : (
                  <span className={styles.imageBlank} aria-hidden="true" />
                )}

                <div className={styles.body}>
                  <h3 className={styles.title}>{promotion.title}</h3>
                  {promotion.body ? <p className={styles.text}>{promotion.body}</p> : null}
                  {promotion.endsAt ? <Countdown endsAt={promotion.endsAt} dict={dict} locale={locale} /> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty} data-reveal>
            {dict.promo.none}
          </p>
        )}
      </div>
    </section>
  );
}

function Countdown({ endsAt, dict, locale }: { endsAt: string; dict: Dictionary; locale: Locale }) {
  const target = new Date(endsAt).getTime();
  const [left, setLeft] = useState<number | null>(null);

  // Starts as null and fills in after mount: the server and the browser would
  // otherwise disagree about "now" and React would report a mismatch.
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (left === null) return null;
  if (left <= 0) return null;

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
      <span className={styles.clockParts} lang={locale}>
        {parts.map((part) => (
          <span key={part.label} className={styles.clockPart}>
            <span className={styles.clockValue}>{String(part.value).padStart(2, '0')}</span>
            <span className={styles.clockUnit}>{part.label}</span>
          </span>
        ))}
      </span>
    </div>
  );
}
