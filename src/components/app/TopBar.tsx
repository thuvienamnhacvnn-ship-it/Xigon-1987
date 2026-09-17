'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './AppShell.module.css';
import { fill, type Dictionary } from '@/lib/dictionary';
import { hrefFor, localeShort, locales, switchPath, type Locale, type RouteKey } from '@/lib/i18n';

/**
 * The bar that never moves: the house on the left, the guest's own controls on
 * the right.
 *
 * The cart always shows its count — a basket you cannot see the size of is a
 * basket people stop trusting — and it shows a zero-state too, so the button
 * does not appear and disappear as items go in and out.
 */
export function TopBar({
  locale,
  dict,
  cartCount,
  current,
}: {
  locale: Locale;
  dict: Dictionary;
  cartCount: number;
  current: RouteKey | null;
}) {
  const pathname = usePathname();

  return (
    <header className={styles.bar}>
      <Link href={hrefFor(locale, 'experience')} className={styles.brand} aria-label={dict.brand.name}>
        <img src="/img/logo.png" alt="" width={104} height={35} />
      </Link>

      <span className={styles.barSpacer} />

      <div className={styles.langs} role="group" aria-label={dict.shell.languageSwitch}>
        {locales.map((code) => (
          <Link
            key={code}
            href={code === locale ? pathname : switchPath(pathname, locale, code)}
            className={styles.lang}
            aria-current={code === locale ? 'true' : undefined}
            hrefLang={code}
          >
            {localeShort[code]}
          </Link>
        ))}
      </div>

      <AccountButton locale={locale} dict={dict} />

      <Link
        href={hrefFor(locale, 'cart')}
        className={styles.cart}
        data-active={current === 'cart' ? 'true' : undefined}
        aria-label={cartCount ? fill(dict.shell.cartCount, { count: cartCount }) : dict.shell.cartEmpty}
      >
        <CartIcon />
        <span className={styles.cartCount} data-empty={cartCount === 0 ? 'true' : undefined}>
          {cartCount}
        </span>
      </Link>
    </header>
  );
}

/**
 * The account button, and what it actually does.
 *
 * There are no guest accounts here and inventing a login would be worse than
 * having none: nothing would be behind it. What a guest really wants from this
 * button is the thing they lost — the link to their booking or their order. So
 * it opens the two lookups, and says plainly that no account is needed.
 */
function AccountButton({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function lookup(event: React.FormEvent<HTMLFormElement>, key: 'reservation' | 'orderStatus') {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const token = String(data.get('token') ?? '').trim();
    if (!token) {
      setError(dict.shell.codeMissing);
      return;
    }
    setError(null);
    setOpen(false);
    router.push(hrefFor(locale, key, { token }));
  }

  return (
    <div className={styles.account} ref={wrapRef}>
      <button
        type="button"
        className={styles.iconButton}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={dict.shell.account}
        onClick={() => setOpen((value) => !value)}
      >
        <UserIcon />
      </button>

      {open ? (
        <div className={styles.panel} role="dialog" aria-label={dict.shell.accountTitle}>
          <p className={styles.panelTitle}>{dict.shell.accountTitle}</p>
          <p className={styles.panelText}>{dict.shell.accountIntro}</p>

          <form className={styles.panelForm} onSubmit={(event) => lookup(event, 'reservation')}>
            <label htmlFor="acc-res">{dict.shell.reservationCode}</label>
            <div className={styles.panelRow}>
              <input id="acc-res" name="token" autoComplete="off" spellCheck={false} />
              <button type="submit" className="btn btn--gold">
                {dict.shell.open}
              </button>
            </div>
          </form>

          <form className={styles.panelForm} onSubmit={(event) => lookup(event, 'orderStatus')}>
            <label htmlFor="acc-ord">{dict.shell.orderCode}</label>
            <div className={styles.panelRow}>
              <input id="acc-ord" name="token" autoComplete="off" spellCheck={false} />
              <button type="submit" className="btn btn--gold">
                {dict.shell.open}
              </button>
            </div>
          </form>

          {error ? (
            <p className={styles.panelError} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.6" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M4.8 20c.8-3.6 3.7-5.6 7.2-5.6s6.4 2 7.2 5.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.4 5.2h2.3l1.9 9.6a1.6 1.6 0 0 0 1.6 1.3h7.4a1.6 1.6 0 0 0 1.6-1.3L19.6 8H6.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19.4" r="1.2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="17" cy="19.4" r="1.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
