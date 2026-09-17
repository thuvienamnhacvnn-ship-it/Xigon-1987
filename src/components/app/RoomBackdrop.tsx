'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import styles from './AppShell.module.css';
import { getRoom, onCommand, setRoom, subscribe } from './room';
import { routeKeyFrom, type Locale } from '@/lib/i18n';

/**
 * The room, behind everything, for the whole visit.
 *
 * This is mounted by the shell and never unmounted: the guest moves between
 * screens and the film stays exactly where it was. On Erleben it runs; on every
 * other screen it is paused on a frame and serves as the background the glass
 * panels float over — which is why leaving the card and coming back does not
 * make the restaurant start its evening again.
 */
export function RoomBackdrop({ locale, pathname }: { locale: Locale; pathname: string }) {
  const room = useSyncExternalStore(subscribe, getRoom, getRoom);
  const videoRef = useRef<HTMLVideoElement>(null);

  /*
   * Whether the guest is standing in the room is read off the path, not
   * reported by the screen that happens to be mounted.
   *
   * Erleben used to announce itself on mount and stand down on unmount, which
   * is fine until two of them exist at once. Switching language does exactly
   * that: it is a different locale segment, so React mounts the new screen
   * before unmounting the old one, and the old one's "I have left" lands after
   * the new one's "I am here". The film stopped and never started again.
   */
  const inTheRoom = routeKeyFrom(locale, pathname) === 'experience';

  /* A new scene is a new film: reload the element, then obey the current state. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setRoom({ ready: false, failed: false });

    /*
     * Muted, set on the element, before anything tries to play it.
     *
     * React assigns `muted` as a property after the element exists, and it does
     * not write the attribute. Chrome decides whether a play is allowed without
     * a gesture by looking at the element at that moment, so the first attempt
     * on a fresh page was refused as an unmuted autoplay — and the refusal was
     * being taken as the guest not wanting the film.
     */
    video.muted = getRoom().muted;
    video.load();

    /*
     * Changing language rebuilds the page — a different locale is a different
     * route segment, so this element is a new one — and a new <video> starts at
     * zero. The store outlives the rebuild, so the film picks up where it was
     * instead of starting the restaurant's evening again.
     */
    const resumeAt = getRoom().at;
    const onMetadata = () => {
      if (resumeAt > 0.5) {
        video.currentTime = Math.min(resumeAt, Math.max(0, (video.duration || resumeAt) - 0.2));
      }
      /*
       * And start it again here, not only in the effect below.
       *
       * That effect fires on a change of state, and during a language switch
       * nothing it watches changes: the store still says the film is running,
       * while the element it is talking about is a brand new one that has never
       * been told to. Re-asserting it the moment this element has data is what
       * closes that gap.
       */
      if (inTheRoom && getRoom().wanted) void video.play().catch(() => undefined);
      video.removeEventListener('loadedmetadata', onMetadata);
    };

    /*
     * Both, and in this order.
     *
     * The second time a scene is shown the file is in the cache and the element
     * has its metadata before this effect ever runs, so `loadedmetadata` never
     * fires again and a listener alone waits for ever — which is precisely the
     * case that matters, because switching language is always the second time.
     */
    if (video.readyState >= 1) onMetadata();
    else video.addEventListener('loadedmetadata', onMetadata);

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
    return () => {
      window.clearTimeout(watchdog);
      video.removeEventListener('loadedmetadata', onMetadata);
    };
  }, [room.scene, inTheRoom]);

  /* Playing is a consequence of where the guest is standing, not a separate
     switch: arriving on Erleben starts the film, leaving it holds the frame. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (inTheRoom && room.wanted) {
      /*
       * A refusal is not an answer about what the guest wants. It is left to
       * the next attempt — the next scene, the next screen, or the button —
       * rather than quietly flipping the switch they never touched.
       */
      void video.play().catch(() => undefined);
    } else if (!video.paused) {
      video.pause();
    }
  }, [inTheRoom, room.wanted, room.scene]);

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
          setRoom({ wanted: video.paused });
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
        /*
         * The attribute, not only the scripted play.
         *
         * Chrome treats the two differently: a muted element carrying
         * `autoplay` is allowed to start on its own, while `play()` called from
         * script before the guest has touched anything can be refused outright
         * — which is why the film sat on its first frame on a freshly opened
         * page and only ever moved once something had been clicked. The script
         * still runs; it is what resumes the film after a scene change or a
         * language switch, when the attribute has already had its one chance.
         */
        autoPlay={inTheRoom}
        muted
        loop
        playsInline
        preload="none"
        tabIndex={-1}
        onPlaying={() => setRoom({ ready: true, running: true })}
        onPause={() => setRoom({ running: false })}
        onTimeUpdate={(event) => setRoom({ at: event.currentTarget.currentTime })}
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
