'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './Header.module.css';
import { openAssistant } from './Assistant';
import { hrefFor, localeShort, locales, switchPath, type Locale, type RouteKey } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

const NAV: { key: RouteKey; label: (d: Dictionary) => string }[] = [
  { key: 'menu', label: (d) => d.nav.menu },
  { key: 'restaurant', label: (d) => d.nav.restaurant },
  { key: 'promoAdmin', label: (d) => d.promo.label },
  { key: 'contact', label: (d) => d.nav.contact },
];

type Props = { locale: Locale; dict: Dictionary; cartCount: number; demoMode: boolean };

/**
 * Two jobs, split by width.
 *
 * On desktop the rail already carries the navigation, so all that is left up
 * here are the two pills from the template, floating over the banner with no
 * bar behind them. Below 1100px the rail is gone, so this becomes a real top
 * bar with the same links behind a drawer.
 */
export function Header({ locale, dict, cartCount, demoMode }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  // Trap focus and lock scrolling while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    focusables?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        burgerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      {demoMode ? <p className={styles.demo}>{dict.footer.demo}</p> : null}

      {/* ---------- the two pills, floating (desktop) ---------- */}
      <div className={styles.pills}>
        <Link href={hrefFor(locale, 'reserve')} className="pill">
          <CalendarIcon />
          {dict.nav.reserve}
          <Arrow />
        </Link>

        <button type="button" className="pill" onClick={() => openAssistant()}>
          <Leaf />
          {dict.nav.assistant}
        </button>

        <Link
          href={hrefFor(locale, 'cart')}
          className={styles.cartPill}
          aria-label={`${dict.nav.cart}${cartCount ? ` (${cartCount})` : ''}`}
        >
          <CartIcon />
          {cartCount > 0 ? <span className={styles.cartCount}>{cartCount}</span> : null}
        </Link>
      </div>

      {/* ---------- the bar (below 1100px) ---------- */}
      <header className={styles.bar}>
        <Link href={hrefFor(locale, 'home')} className={styles.brand} aria-label={dict.brand.name}>
          <img src="/img/logo.png" alt="" width={92} height={31} />
        </Link>

        <span className={styles.spacer} />

        <Link
          href={hrefFor(locale, 'cart')}
          className={styles.cartLink}
          aria-label={`${dict.nav.cart}${cartCount ? ` (${cartCount})` : ''}`}
        >
          <CartIcon />
          {cartCount > 0 ? <span className={styles.cartCount}>{cartCount}</span> : null}
        </Link>

        <button
          ref={burgerRef}
          type="button"
          className={styles.burger}
          aria-expanded={open}
          aria-label={open ? dict.nav.closeMenu : dict.nav.openMenu}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.bars} aria-hidden="true" />
        </button>
      </header>

      {open ? (
        <div className={styles.drawer} ref={drawerRef} role="dialog" aria-modal="true" aria-label={dict.nav.menu}>
          <div className={styles.drawerTop}>
            <img src="/img/logo.png" alt={dict.brand.name} width={92} height={31} />
            <button type="button" className={styles.burger} onClick={() => setOpen(false)} aria-label={dict.nav.closeMenu}>
              ✕
            </button>
          </div>

          <nav className={styles.drawerNav} aria-label={dict.nav.menu}>
            {NAV.map((item) => (
              <Link key={item.key} href={hrefFor(locale, item.key)} className={styles.drawerLink}>
                {item.label(dict)}
              </Link>
            ))}
            <Link href={hrefFor(locale, 'order')} className={styles.drawerLink}>
              {dict.nav.order}
            </Link>
          </nav>

          <div className={styles.drawerActions}>
            <Link href={hrefFor(locale, 'reserve')} className="btn btn--gold btn--block">
              {dict.nav.reserve}
            </Link>
            <button
              type="button"
              className="btn btn--block"
              onClick={() => {
                setOpen(false);
                openAssistant();
              }}
            >
              {dict.nav.assistant}
            </button>

            <div className={styles.drawerLangs}>
              {locales.map((code) => (
                <Link
                  key={code}
                  href={code === locale ? pathname : switchPath(pathname, locale, code)}
                  className={styles.drawerLang}
                  aria-current={code === locale ? 'true' : undefined}
                  hrefLang={code}
                >
                  {localeShort[code]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Leaf() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 17c0-6 4.5-11 14-12 0 8.5-4.5 12-11 12H3z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M6 14.5c1.8-2.6 4.3-4.6 7.5-6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="4" width="15" height="13.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 8h15M6.5 2v4M13.5 2v4M10 11v4M8 13h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="20" height="9" viewBox="0 0 22 10" fill="none" aria-hidden="true">
      <path d="M0 5h20M16 1l4 4-4 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 4.5h2l1.6 8.2a1.4 1.4 0 0 0 1.4 1.1h6.3a1.4 1.4 0 0 0 1.4-1.1L17 7H6"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="17" r="1" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="14.5" cy="17" r="1" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}
