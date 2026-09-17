'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './SceneStage.module.css';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

type SceneId = 'atmosphaere' | 'kueche' | 'bar';
const SCENES: SceneId[] = ['atmosphaere', 'kueche', 'bar'];

/**
 * The restaurant, full frame.
 *
 * Three cuts from the house video. Only the chosen one is in the DOM, so the
 * browser never downloads two films to show one: switching scenes swaps the
 * <source> set and calls load(), and `preload="none"` keeps the other two off
 * the wire entirely until they are asked for.
 *
 * Autoplay is muted, because every browser blocks anything else, and the sound
 * control says which state it is in rather than which state it would go to.
 * If playback fails for any reason — codec, policy, a blocked file — the poster
 * stays and the notice explains it. A dead black rectangle would not.
 */
export function SceneStage({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [scene, setScene] = useState<SceneId>('atmosphaere');
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // A new scene is a new film: reload the element and start it again.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setReady(false);
    setFailed(false);
    video.load();
    if (playing) {
      void video.play().catch(() => {
        /* Autoplay refused. The poster is already showing; say so honestly. */
        setPlaying(false);
      });
    }

    /*
     * A watchdog, because the interesting failure is silent.
     *
     * A missing file fires `error` and a refused autoplay rejects the promise,
     * and both of those we already handle. What neither covers is a browser
     * that accepts the file and then never decodes a frame — no event, no
     * error, `readyState` stuck at nothing. Left alone the screen says "loading"
     * for as long as the guest is willing to look at it. After eight seconds we
     * stop claiming to be loading and show the still instead.
     */
    const watchdog = window.setTimeout(() => {
      if (video.readyState < 2) setFailed(true);
    }, 8000);
    return () => window.clearTimeout(watchdog);
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => setPlaying(true)).catch(() => setFailed(true));
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  return (
    <section className={styles.stage} aria-label={dict.experience.scenes[scene]}>
      <video
        ref={videoRef}
        className={styles.video}
        poster={`/img/video/${scene}-poster.webp`}
        autoPlay
        muted={muted}
        loop
        playsInline
        preload="none"
        aria-label={dict.experience.scenes[scene]}
        onPlaying={() => {
          setReady(true);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
      >
        {/*
         * H.264 first, even though the VP9 file is slightly smaller.
         *
         * VP9 is decoded in software on older graphics hardware, and on the
         * machine this was built on it froze the whole renderer — no video, no
         * page, nothing. H.264 has a hardware path on everything from the last
         * fifteen years. The webm stays as a fallback for the rare browser that
         * cannot take the mp4; it costs nothing when it is not chosen.
         */}
        <source src={`/img/video/${scene}.mp4`} type="video/mp4" />
        <source src={`/img/video/${scene}.webm`} type="video/webm" />
      </video>

      <div className={styles.veil} aria-hidden="true" />

      {/* ---------- the words ---------- */}
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{dict.experience.eyebrow}</p>
        <h1 className={styles.title}>
          {dict.experience.title.split('\n').map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h1>
        <p className={styles.text}>{dict.experience.text}</p>

        <div className={styles.actions}>
          <Link href={hrefFor(locale, 'menu')} className="btn btn--gold">
            {dict.experience.ctaMenu}
          </Link>
          <Link href={hrefFor(locale, 'reserve')} className="btn">
            {dict.experience.ctaReserve}
          </Link>
        </div>
      </div>

      {/* ---------- the controls ---------- */}
      <div className={styles.controls}>
        <div className={styles.scenes} role="group" aria-label={dict.experience.sceneLabel}>
          {SCENES.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.scene}
              aria-pressed={id === scene}
              onClick={() => setScene(id)}
            >
              {dict.experience.scenes[id]}
            </button>
          ))}
        </div>

        <span className={styles.controlSpacer} />

        <button
          type="button"
          className={styles.round}
          onClick={togglePlay}
          aria-label={playing ? dict.experience.pause : dict.experience.play}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          type="button"
          className={styles.round}
          onClick={toggleSound}
          aria-label={muted ? dict.experience.unmute : dict.experience.mute}
        >
          {muted ? <MutedIcon /> : <SoundIcon />}
        </button>
      </div>

      {failed ? (
        <p className={styles.notice} role="status">
          {dict.experience.videoError}
        </p>
      ) : !ready ? (
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
