'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Fades elements in as they arrive.
 *
 * One observer for the whole page, attached to anything marked `data-reveal`,
 * so a section only has to declare the attribute.
 *
 * The important part is what happens when the observer does not do its job.
 * These elements start at `opacity: 0`; if the reveal never fires, the content
 * is simply invisible — a decoration that can hide the page is not worth
 * having. So there are three ways in: the observer, a scroll handler that
 * sweeps anything already on screen, and a timer that gives up on the effect
 * entirely and shows everything.
 */
export function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const pending = () =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).filter(
        (element) => element.getAttribute('data-reveal') !== 'in',
      );

    const show = (element: HTMLElement) => element.setAttribute('data-reveal', 'in');
    const showAll = () => pending().forEach(show);

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    pending().forEach((element) => observer.observe(element));

    // Belt and braces: anything that is on screen gets shown whether or not the
    // observer noticed, including after a programmatic jump to an anchor.
    const sweep = () => {
      for (const element of pending()) {
        const box = element.getBoundingClientRect();
        if (box.top < window.innerHeight && box.bottom > 0) show(element);
      }
    };

    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep, { passive: true });
    const first = window.setTimeout(sweep, 120);
    // And if something has gone wrong with all of that, show the page anyway.
    const giveUp = window.setTimeout(showAll, 4000);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', sweep);
      window.removeEventListener('resize', sweep);
      window.clearTimeout(first);
      window.clearTimeout(giveUp);
    };
    // Re-runs per page: a client navigation replaces the marked elements.
  }, [pathname]);

  return null;
}
