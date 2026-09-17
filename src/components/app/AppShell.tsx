'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AppShell.module.css';
import { Dock } from './Dock';
import { RoomBackdrop } from './RoomBackdrop';
import { TopBar } from './TopBar';
import { hrefFor, routeKeyFrom, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * The frame every screen lives in.
 *
 * The room fills the window — all of it, corner to corner. Nothing is laid over
 * it to make text readable, because no text sits on it: a screen that has
 * something to say puts it on a panel of smoked glass floating above the room,
 * and the room stays visible around the panel. So the bar, the dock and the
 * footer do not occupy rows. They float, and the content simply keeps enough
 * padding clear for them.
 *
 * It reads the path itself rather than being told which screen is current.
 *
 * That is not a preference. A layout is a server component and Next does not
 * re-run it when the guest moves between two routes that share it, so a
 * `current` passed in from the layout is the screen the guest opened first and
 * stays that way for the rest of the visit: the dock highlights the wrong item,
 * the bar names the wrong screen, and — worst — `bare` never comes back, so
 * returning to Erleben leaves the room framed by the padding of whatever screen
 * was open before it.
 */
export function AppShell({
  locale,
  dict,
  cartCount,
  demoMode,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  cartCount: number;
  demoMode: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = routeKeyFrom(locale, pathname);
  /* Erleben is the room itself: no panel, no padding, no scrim over the film. */
  const bare = current === 'experience';

  return (
    <div className={styles.shell} data-bare={bare ? 'true' : undefined}>
      {/*
       * One film, for the whole visit. It is mounted here rather than inside
       * Erleben so that moving to the card and back does not restart the
       * restaurant's evening: it stops on a frame and goes on again.
       */}
      <RoomBackdrop />

      <main id="main" className={`${styles.content} screen-panel`} data-bare={bare ? 'true' : undefined}>
        {children}
      </main>

      <TopBar locale={locale} dict={dict} cartCount={cartCount} current={current} />
      <Dock locale={locale} dict={dict} current={current} />

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
           * which would see every scan and every page view.
           */}
          <Link href={hrefFor(locale, 'contact')} className={styles.footQr} aria-label={dict.contact.qrTitle}>
            <img src="/img/qr/route.svg" alt="" width={34} height={34} />
          </Link>
        </footer>
      ) : null}
    </div>
  );
}
