import Link from 'next/link';
import styles from './AppShell.module.css';
import { Dock } from './Dock';
import { RoomBackdrop } from './RoomBackdrop';
import { TopBar } from './TopBar';
import { hrefFor, type Locale, type RouteKey } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * The frame every screen lives in.
 *
 * The room fills the window — all of it, corner to corner, at the brightness it
 * was shot at. Nothing is laid over it to make text readable, because no text
 * sits on it: a screen that has something to say puts it on a panel of smoked
 * glass floating above the room, and the room stays visible around the panel.
 *
 * So the bar, the dock and the footer do not occupy rows. They float. The only
 * thing that reserves space is the padding the content keeps clear for them,
 * which is why the dock can never land on a button and the picture is never cut
 * short to make room for furniture.
 */
export function AppShell({
  locale,
  dict,
  cartCount,
  demoMode,
  current,
  children,
  /** Erleben is the room itself, so it supplies its own moving backdrop. */
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
       * One film, for the whole visit. It is mounted here rather than inside
       * Erleben so that moving to the card and back does not restart the
       * restaurant's evening: it simply stops on a frame and goes on again.
       */}
      <RoomBackdrop />

      {/*
       * The shell frames; it does not draw.
       *
       * It supplies a band of the window — clear of the bar above and the dock
       * below, and no wider than the eye can read across — and each screen
       * builds its own furniture inside it. One screen is a single pane of
       * glass, another is three separate cards on the photograph, and a shared
       * wrapper would make the second impossible.
       */}
      <main id="main" className={`${styles.content} screen-panel`} data-bare={bare ? 'true' : undefined}>
        {children}
      </main>

      <TopBar locale={locale} dict={dict} cartCount={cartCount} current={current} />
      <Dock locale={locale} dict={dict} current={current} />

      {/*
       * The legal line sits in the corner of the room, small, the way it does on
       * a printed menu. It is not a section of the page and it never takes a
       * row of height from the screen above it.
       */}
      {!bare ? (
        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} XIGON 1987</span>
          <span className={styles.dot}>·</span>
          <Link href={hrefFor(locale, 'imprint')}>{dict.footer.imprint}</Link>
          <span className={styles.dot}>·</span>
          <Link href={hrefFor(locale, 'privacy')}>{dict.footer.privacy}</Link>
          {demoMode ? <span className={styles.demo}>{dict.shell.demoBadge}</span> : null}

          {/*
           * The code in the corner is the one in the drawings, and it is real:
           * it opens directions to Nürnberger Str. 46. It is generated into the
           * repository by `npm run qr` rather than fetched from a QR service,
           * because such a service would see every scan and every page view.
           */}
          <Link href={hrefFor(locale, 'contact')} className={styles.footQr} aria-label={dict.contact.qrTitle}>
            <img src="/img/qr/route.svg" alt="" width={34} height={34} />
          </Link>
        </footer>
      ) : null}
    </div>
  );
}
