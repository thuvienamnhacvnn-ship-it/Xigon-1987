'use client';

import Link from 'next/link';
import { useEffect, useSyncExternalStore } from 'react';
import styles from './SceneStage.module.css';
import { SCENES, getRoom, send, setRoom, subscribe } from './room';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * Erleben.
 *
 * There is no headline here and no button asking for anything. The screen is
 * the room — the film behind it belongs to the shell and keeps running across
 * the whole visit — and all this component adds are the controls for looking
 * around it.
 *
 * Mounting marks the guest as standing in the room, which is what starts the
 * film; unmounting, on the way to any other screen, is what holds it on a frame.
 */
export function SceneStage({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const room = useSyncExternalStore(subscribe, getRoom, getRoom);

  useEffect(() => {
    setRoom({ active: true, playing: true });
    return () => setRoom({ active: false });
  }, []);

  return (
    <section className={styles.stage} aria-label={dict.dock.experience}>
      {/* ---------- the scenes, top centre ---------- */}
      <div className={styles.scenes} role="group" aria-label={dict.experience.sceneLabel}>
        {SCENES.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.scene}
            aria-pressed={id === room.scene}
            onClick={() => setRoom({ scene: id, playing: true })}
          >
            {dict.experience.scenes[id]}
          </button>
        ))}
      </div>

      {/* ---------- the rail, left edge ---------- */}
      <div className={styles.rail}>
        <a
          className={styles.railButton}
          href="https://www.instagram.com/xigon1987/"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Instagram"
        >
          <InstagramIcon />
        </a>
        <a
          className={styles.railButton}
          href="https://www.facebook.com/xigon1987/"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Facebook"
        >
          <FacebookIcon />
        </a>
        <a
          className={styles.railButton}
          href="https://www.tiktok.com/@xigon1987"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="TikTok"
        >
          <TikTokIcon />
        </a>

        <Link
          href={hrefFor(locale, 'assistant')}
          className={`${styles.railButton} ${styles.railAi}`}
          aria-label={dict.nav.assistant}
        >
          <BrainIcon />
          <span>AI</span>
        </Link>

        <span className={styles.railRule} aria-hidden="true" />
        <span className={styles.railWord}>{dict.experience.follow}</span>
      </div>

      {/* ---------- the bar, where it actually is in the shot ---------- */}
      <Link href={hrefFor(locale, 'contact')} className={styles.hotspot}>
        <span className={styles.hotspotMark} aria-hidden="true">
          +
        </span>
        <span className={styles.hotspotLabel}>{dict.experience.barSpot}</span>
      </Link>

      {/* ---------- the controls, bottom right ---------- */}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.round}
          onClick={() => send('toggle-play')}
          aria-label={room.playing ? dict.experience.pause : dict.experience.play}
        >
          {room.playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          type="button"
          className={styles.round}
          onClick={() => send('toggle-sound')}
          aria-label={room.muted ? dict.experience.unmute : dict.experience.mute}
        >
          {room.muted ? <MutedIcon /> : <SoundIcon />}
        </button>
      </div>

      {room.failed ? (
        <p className={styles.notice} role="status">
          {dict.experience.videoError}
        </p>
      ) : !room.ready ? (
        <p className={styles.notice} role="status">
          {dict.experience.loading}
        </p>
      ) : null}
    </section>
  );
}

const box = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' } as const;
const line = { stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function PlayIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <path d="M8 5.4 19 12 8 18.6V5.4Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <path d="M9 5v14M15 5v14" {...line} strokeWidth={2} />
    </svg>
  );
}

function SoundIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <path d="M4 9.5h3.4L12 5.4v13.2L7.4 14.5H4v-5Z" {...line} />
      <path d="M15.6 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4" {...line} />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <path d="M4 9.5h3.4L12 5.4v13.2L7.4 14.5H4v-5Z" {...line} />
      <path d="m16 9.6 4.4 4.8M20.4 9.6 16 14.4" {...line} />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" {...line} strokeWidth={1.4} />
      <circle cx="12" cy="12" r="4.1" {...line} strokeWidth={1.4} />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.25-1.5 1.5-1.5H17.7V4.3A20 20 0 0 0 15.4 4.2c-2.3 0-3.9 1.4-3.9 4v2.2H8.9v3h2.6V21h3.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.2 3h2.6a5 5 0 0 0 4.2 4.3v2.6a7.4 7.4 0 0 1-4.2-1.4v6.2a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.7a3 3 0 1 0 2.2 2.9V3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.5 4.2A2.7 2.7 0 0 0 6.8 7a2.6 2.6 0 0 0-1.6 4.5A2.7 2.7 0 0 0 6.8 16a2.7 2.7 0 0 0 2.7 2.8c.8 0 1.5-.4 2-.9V5.1c-.5-.5-1.2-.9-2-.9ZM14.5 4.2A2.7 2.7 0 0 1 17.2 7a2.6 2.6 0 0 1 1.6 4.5A2.7 2.7 0 0 1 17.2 16a2.7 2.7 0 0 1-2.7 2.8c-.8 0-1.5-.4-2-.9V5.1c.5-.5 1.2-.9 2-.9Z"
        {...line}
        strokeWidth={1.2}
      />
    </svg>
  );
}
