'use client';

import { useState } from 'react';
import styles from './MapCard.module.css';
import { RESTAURANT, mapsQuery } from '@/lib/restaurant';
import type { Dictionary } from '@/lib/dictionary';

/**
 * The way here.
 *
 * The OpenStreetMap frame is not loaded until the guest asks for it: embedding
 * it on sight would send every visitor's IP to a third party before they ever
 * agreed to it. Until then we draw our own little plan of the corner, which is
 * enough to know where the door is.
 */
export function MapCard({ dict }: { dict: Dictionary }) {
  const [loaded, setLoaded] = useState(false);

  const { latitude: lat, longitude: lon } = RESTAURANT;
  const box = [lon - 0.004, lat - 0.002, lon + 0.004, lat + 0.002].map((n) => n.toFixed(5)).join('%2C');
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <div className={styles.card}>
      {loaded ? (
        <iframe
          className={styles.frame}
          src={embed}
          title={dict.contact.transit}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <button type="button" className={styles.placeholder} onClick={() => setLoaded(true)}>
          <StreetPlan />
          <span className={styles.pin} aria-hidden="true">
            <span className={styles.pinDot} />
          </span>
          <span className={styles.prompt}>
            <span className={styles.promptTitle}>{dict.contact.mapConsent}</span>
            <span className={styles.promptNote}>{dict.contact.mapNote}</span>
          </span>
        </button>
      )}

      <div className={styles.foot}>
        <p className={styles.address}>
          {RESTAURANT.street}
          <br />
          {RESTAURANT.postalCode} {RESTAURANT.city}
          <br />
          <span className={styles.transit}>{RESTAURANT.transit}</span>
        </p>
        <a
          className="btn btn--sm"
          href={`https://www.openstreetmap.org/search?query=${mapsQuery()}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          {dict.contact.directions}
        </a>
      </div>
    </div>
  );
}

/**
 * A drawn plan of the block rather than a screenshot of a map — no tiles are
 * fetched, and it keeps the gold-on-navy language of the rest of the page.
 */
function StreetPlan() {
  return (
    <svg className={styles.plan} viewBox="0 0 400 260" fill="none" aria-hidden="true">
      <path d="M-10 168h420M-10 176h420" stroke="var(--gold)" strokeOpacity="0.5" strokeWidth="1" />
      <path d="M198 -10v280M206 -10v280" stroke="var(--gold)" strokeOpacity="0.35" strokeWidth="1" />
      <path d="M-10 64h420" stroke="var(--gold)" strokeOpacity="0.18" strokeWidth="1" />
      <path d="M92 -10v280" stroke="var(--gold)" strokeOpacity="0.18" strokeWidth="1" />
      <path d="M308 -10v280" stroke="var(--gold)" strokeOpacity="0.18" strokeWidth="1" />

      {[
        [20, 86, 60, 68],
        [96, 86, 96, 68],
        [212, 86, 84, 68],
        [312, 86, 72, 68],
        [20, 190, 64, 56],
        [100, 190, 88, 56],
        [216, 190, 76, 56],
        [304, 190, 84, 56],
      ].map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} stroke="var(--gold)" strokeOpacity="0.14" />
      ))}

      <text x="16" y="162" className={styles.planLabel}>
        NÜRNBERGER STR.
      </text>
      <text x="214" y="40" className={styles.planLabel}>
        AUGSBURGER STR.
      </text>
    </svg>
  );
}
