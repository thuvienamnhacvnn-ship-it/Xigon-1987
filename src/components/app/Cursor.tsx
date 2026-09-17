'use client';

import { useEffect, useRef } from 'react';
import styles from './Cursor.module.css';

/**
 * A tail of light that chases the pointer.
 *
 * Fourteen points, each easing towards the one ahead of it rather than towards
 * the cursor. That is what makes it a tail and not a swarm: chase the cursor
 * directly and every point arrives on the same spot, one behind another only
 * while the hand is moving fast. Chained, they string out through the corner
 * the hand actually took and gather up behind it when it stops.
 *
 * The head carries a ring that opens over anything that can be pressed — on a
 * site made almost entirely of glass, that is worth saying.
 *
 * It does not replace the system cursor. Hiding it is a fashion that costs
 * people the one thing they can always rely on; this is drawn behind it.
 *
 * Nothing goes through React state. A pointer reports position dozens of times
 * a second, and re-rendering a tree that often to move a dot is how a site
 * starts dropping frames — the points are written straight to `transform`
 * inside one animation frame.
 */
const POINTS = 14;

/*
 * How hard each point is pulled towards the one ahead. Higher is tighter: the
 * head keeps up with the hand, the tail hangs back and arrives late, which is
 * the whole of the effect.
 */
const LEAD_PULL = 0.34;
const TAIL_PULL = 0.16;

export function Cursor() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /*
     * A touchscreen has no pointer to chase, and a guest who asked for less
     * motion has asked for exactly this to stop. Both before anything is drawn.
     */
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const host = hostRef.current;
    if (!host) return;

    const nodes: HTMLSpanElement[] = [];
    for (let index = 0; index < POINTS; index += 1) {
      const node = document.createElement('span');
      node.className = index === 0 ? `${styles.point} ${styles.head}` : styles.point;
      // Furthest back is smallest and faintest, so the tail thins to nothing.
      const along = index / (POINTS - 1);
      node.style.setProperty('--size', `${11 - along * 8}px`);
      node.style.setProperty('--fade', String(0.9 - along * 0.78));
      host.append(node);
      nodes.push(node);
    }

    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    const chain = nodes.map(() => ({ x: pointerX, y: pointerY }));
    let awake = false;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;

      if (!awake) {
        awake = true;
        for (const link of chain) {
          link.x = pointerX;
          link.y = pointerY;
        }
        host.dataset.on = 'true';
      }

      /*
       * Whether the head opens is asked of the element under the pointer rather
       * than kept as a list of selectors every component must remember to join.
       * `closest` walks up, so a label inside a button counts as the button —
       * which is what the guest is aiming at.
       */
      const target = event.target as Element | null;
      const live = target?.closest('a, button, input, select, textarea, [role="button"], summary');
      host.dataset.live = live ? 'true' : undefined;
    };

    const sleep = () => {
      awake = false;
      host.dataset.on = undefined;
    };

    const tick = () => {
      for (let index = 0; index < chain.length; index += 1) {
        const link = chain[index];
        const aheadX = index === 0 ? pointerX : chain[index - 1].x;
        const aheadY = index === 0 ? pointerY : chain[index - 1].y;
        const pull = index === 0 ? LEAD_PULL : TAIL_PULL;
        link.x += (aheadX - link.x) * pull;
        link.y += (aheadY - link.y) * pull;
        nodes[index].style.transform = `translate3d(${link.x}px, ${link.y}px, 0) translate(-50%, -50%)`;
      }
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
      for (const node of nodes) node.remove();
    };
  }, []);

  return <div ref={hostRef} className={styles.trail} aria-hidden="true" />;
}
