import Link from 'next/link';
import styles from './AppShell.module.css';
import { Dock } from './Dock';
import { TopBar } from './TopBar';
import { hrefFor, type Locale, type RouteKey } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * The frame every screen lives in.
 *
 * The site is an application, not a long page: the restaurant behind the glass
 * never moves, the bar at the top and the dock at the bottom never move, and
 * only the middle changes when a dock item is pressed. Each screen has its own
 * URL, so Back, Forward and a pasted link all work.
 *
 * The layout is three rows — bar, content, dock — in a viewport-height grid, so
 * the dock can never cover the buttons of the screen above it. Only the content
 * row scrolls, and only when a screen genuinely needs it.
 */
export function AppShell({
  locale,
  dict,
  cartCount,
  demoMode,
  current,
  children,
  /** Erleben plays video behind everything, so it supplies its own backdrop. */
  bare = false,
}: {
  locale: Locale;
  dict: Dictionary;
  cartCount: number;
  demoMode: boolean;
  current: RouteKey | null;
  children: React.ReactNode;
  bare?: boolean;
}) {
  return (
    <div className={styles.shell} data-bare={bare ? 'true' : undefined}>
      {/*
       * The room, once, behind every screen. A single element rather than a
       * background on each page, so switching screens never reloads it and
       * never flashes.
       */}
      {!bare ? (
        <div className={styles.backdrop} aria-hidden="true">
          <img src="/img/scene/hall-wide-1600.webp" alt="" className={styles.backdropImg} />
          <span className={styles.backdropVeil} />
        </div>
      ) : null}

      <TopBar locale={locale} dict={dict} cartCount={cartCount} current={current} />

      <main id="main" className={styles.content}>
        {children}
      </main>

      <Dock locale={locale} dict={dict} current={current} />

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} XIGON 1987</span>
        <span className={styles.dot}>·</span>
        <Link href={hrefFor(locale, 'imprint')}>{dict.footer.imprint}</Link>
        <span className={styles.dot}>·</span>
        <Link href={hrefFor(locale, 'privacy')}>{dict.footer.privacy}</Link>
        <span className={styles.dot}>·</span>
        <Link href={hrefFor(locale, 'contact')}>{dict.nav.contact}</Link>
        {demoMode ? <span className={styles.demo}>{dict.footer.demo}</span> : null}
      </footer>
    </div>
  );
}
