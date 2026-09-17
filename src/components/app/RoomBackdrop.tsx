'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import styles from './AppShell.module.css';
import { getRoom, onCommand, setRoom, subscribe } from './room';

/**
 * The room, behind everything, for the whole visit.
 *
 * This is mounted by the shell and never unmounted: the guest moves between
 * screens and the film stays exactly where it was. On Erleben it runs; on every
 * other screen it is paused on a frame and serves as the background the glass
 * panels float over — which is why leaving the card and coming back does not
 * make the restaurant start its evening again.
 */
export function RoomBackdrop() {
  const room = useSyncExternalStore(subscribe, getRoom, getRoom);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* A new scene is a new film: reload the element, then obey the current state. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setRoom({ ready: false, failed: false });
    video.load();

    /*
     * A watchdog, because the interesting failure is silent. A missing file
     * fires `error` and a refused autoplay rejects the play promise, and both
     * of those are handled below. What neither covers is a browser that accepts
     * the file and then never decodes a frame — no event, no error,
     * `readyState` stuck at nothing, and a screen that claims to be loading for
     * as long as anyone is willing to look at it.
     */
    const watchdog = window.setTimeout(() => {
      if (video.readyState < 2) setRoom({ failed: true });
    }, 8000);
    return () => window.clearTimeout(watchdog);
  }, [room.scene]);

  /* Playing is a consequence of where the guest is standing, not a separate
     switch: arriving on Erleben starts the film, leaving it holds the frame. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (room.active && room.playing) {
      void video.play().catch(() => setRoom({ playing: false }));
    } else if (!video.paused) {
      video.pause();
    }
  }, [room.active, room.playing, room.scene]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = room.muted;
  }, [room.muted]);

  useEffect(
    () =>
      onCommand((command) => {
        const video = videoRef.current;
        if (!video) return;
        if (command === 'toggle-play') {
          setRoom({ playing: video.paused });
        } else {
          setRoom({ muted: !video.muted });
        }
      }),
    [],
  );

  return (
    <div className={styles.backdrop} aria-hidden="true">
      <video
        ref={videoRef}
        className={styles.backdropVideo}
        poster={`/img/video/${room.scene}-poster.webp`}
        muted
        loop
        playsInline
        preload="none"
        tabIndex={-1}
        onPlaying={() => setRoom({ ready: true, playing: true })}
        onPause={() => setRoom({ playing: false })}
        onError={() => setRoom({ failed: true })}
      >
        {/*
         * H.264 first, even though the VP9 file is slightly smaller. VP9 is
         * decoded in software on older graphics hardware, and on the machine
         * this was built on it froze the whole renderer — no video, no page.
         */}
        <source src={`/img/video/${room.scene}.mp4`} type="video/mp4" />
        <source src={`/img/video/${room.scene}.webm`} type="video/webm" />
      </video>
    </div>
  );
}
