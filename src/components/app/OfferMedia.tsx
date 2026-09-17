'use client';

import { useEffect, useState } from 'react';
import styles from './OfferBoard.module.css';
import type { PromoMedia } from '@/db/schema';

/**
 * What an offer shows: one picture, several that take turns, or a short clip.
 *
 * Several photographs is the common case — an offer is usually easier to show
 * than to describe — so the card cycles them on its own rather than asking the
 * guest to press anything. Five seconds each: long enough to look at, short
 * enough that a guest reading the card below sees the second one before they
 * have finished.
 *
 * A clip plays muted and loops, and never autoplays sound. Where there are
 * several items and one of them is a clip, the clip gets its turn like the
 * rest — the rotation waits for its own timer, not for the video to end, so a
 * long clip cannot hold the card hostage.
 */
const TURN_MS = 5000;

export function OfferMedia({ media, alt }: { media: PromoMedia[]; alt: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (media.length < 2) return;
    /*
     * Motion the guest did not ask for. Someone who has asked for less of it
     * gets the first item and no rotation, which is the whole offer either way.
     */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % media.length);
    }, TURN_MS);
    return () => window.clearInterval(timer);
  }, [media.length]);

  if (!media.length) {
    /* An honest empty frame. Borrowing another offer's picture is what a guest
       would take for the offer itself. */
    return <span className={styles.noImage} aria-hidden="true" />;
  }

  const item = media[Math.min(index, media.length - 1)];

  return (
    <div className={styles.media}>
      {item.kind === 'video' ? (
        <video
          key={item.path}
          className={styles.image}
          src={item.path}
          poster={item.poster ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={alt}
        />
      ) : (
        <img
          key={item.path}
          className={styles.image}
          src={item.path}
          alt={alt}
          width={item.width ?? undefined}
          height={item.height ?? undefined}
          loading="lazy"
          decoding="async"
        />
      )}

      {/*
       * The dots say how many there are and which one this is. Without them a
       * card that changes by itself reads as a glitch rather than as a set.
       */}
      {media.length > 1 ? (
        <span className={styles.dots} aria-hidden="true">
          {media.map((entry, dot) => (
            <span key={entry.path} className={styles.dot} data-on={dot === index ? 'true' : undefined} />
          ))}
        </span>
      ) : null}
    </div>
  );
}
