'use client';

import { useEffect, useRef } from 'react';
import styles from './Cursor.module.css';

/**
 * Candlelight under the pointer.
 *
 * The first attempt was a chain of gold dots trailing the cursor. It was the
 * wrong instrument entirely: a restaurant built out of lamplight and smoked
 * glass does not want a comet drawn across it, and fourteen bright points
 * competing with the photographs read as a toy.
 *
 * This is a single soft pool of warm light that lags a little behind the hand,
 * blended into whatever is under it rather than drawn on top. On the glass it
 * looks like a candle being carried past; over a photograph it barely shows.
 * It brightens and widens over anything that can be pressed, which on a site
 * made almost entirely of glass is worth saying quietly.
 *
 * Nothing goes through React state. A pointer reports position dozens of times
 * a second, and re-rendering a tree that often to move a gradient is how a site
 * starts dropping frames.
 */
export function Cursor() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /*
     * A touchscreen has no pointer to light, and a guest who asked for less
     * motion has asked for exactly this. Both checked before anything is drawn.
     */
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const glow = glowRef.current;
    if (!glow) return;

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let lightX = pointerX;
    let lightY = pointerY;
    let awake = false;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!awake) {
        awake = true;
        lightX = pointerX;
        lightY = pointerY;
        glow.dataset.on = 'true';
      }

      /*
       * Whether the light swells is asked of the element under the pointer
       * rather than kept as a list of selectors every component must remember
       * to join. `closest` walks up, so a label inside a button counts as the
       * button — which is what the guest is aiming at.
       */
      const target = event.target as Element | null;
      const live = target?.closest('a, button, input, select, textarea, [role="button"], summary');
      glow.dataset.live = live ? 'true' : undefined;
    };

    const sleep = () => {
      awake = false;
      glow.dataset.on = undefined;
    };

    /*
     * Eased, not pinned. A pool of light that sits exactly on the cursor is
     * just a cursor; the small lag is what makes it read as something being
     * carried.
     */
    const tick = () => {
      lightX += (pointerX - lightX) * 0.12;
      lightY += (pointerY - lightY) * 0.12;
      glow.style.transform = `translate3d(${lightX}px, ${lightY}px, 0) translate(-50%, -50%)`;
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', sleep);
    window.addEventListener('blur', sleep);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', sleep);
      window.removeEventListener('blur', sleep);
    };
  }, []);

  return <div ref={glowRef} className={styles.glow} aria-hidden="true" />;
}
