'use client';

import { useEffect, useRef } from 'react';
import styles from './Cursor.module.css';

/**
 * A light that follows the pointer.
 *
 * A gold ring that trails a little behind the cursor and opens out over
 * anything that can be pressed — the same brass-and-candlelight language as the
 * rest of the site, and a way of telling a guest what is live on a screen where
 * almost everything is glass.
 *
 * It does not replace the system cursor. Hiding it is a fashion that costs
 * people the one thing they can always rely on: a pointer that behaves the way
 * their machine says it should. This is drawn behind it.
 *
 * Nothing here goes through React state. A pointer move fires dozens of times a
 * second, and re-rendering a tree that often to move a circle is how a site
 * starts dropping frames; the ring is positioned directly and eased on the
 * animation frame instead.
 */
export function Cursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /*
     * A touchscreen has no pointer to follow, and a guest who has asked for
     * less motion has asked for exactly this to stop. Both are checked before
     * anything is drawn rather than after.
     */
    const fine = window.matchMedia('(pointer: fine)');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || still.matches) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let ringX = pointerX;
    let ringY = pointerY;
    let frame = 0;
    let visible = false;

    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!visible) {
        visible = true;
        ringX = pointerX;
        ringY = pointerY;
        ring.dataset.on = 'true';
        dot.dataset.on = 'true';
      }

      dot.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;

      /*
       * Whether the ring should open is asked of the element under the pointer,
       * not maintained as a list of selectors each component has to remember to
       * join. `closest` walks up, so a label inside a button counts as the
       * button — which is what the guest is aiming at.
       */
      const target = event.target as Element | null;
      const live = target?.closest('a, button, input, select, textarea, [role="button"], summary');
      ring.dataset.live = live ? 'true' : undefined;
    };

    const onLeave = () => {
      visible = false;
      ring.dataset.on = undefined;
      dot.dataset.on = undefined;
    };

    /*
     * The ring is eased towards the pointer rather than pinned to it: a sixth of
     * the remaining distance each frame. That lag is the whole effect — a ring
     * that sits exactly on the cursor is just a bigger cursor.
     */
    const tick = () => {
      ringX += (pointerX - ringX) * 0.16;
      ringY += (pointerY - ringY) * 0.16;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className={styles.ring} aria-hidden="true" />
      <div ref={dotRef} className={styles.dot} aria-hidden="true" />
    </>
  );
}
