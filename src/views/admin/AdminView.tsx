import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './Admin.module.css';
import { AdminLogin } from './AdminLogin';
import { AdminBook } from './AdminBook';
import { AdminChannels } from './AdminChannels';
import { AdminOrders } from './AdminOrders';
import { AdminPayments } from './AdminPayments';
import { AdminPromos } from './AdminPromos';
import { signOutAction } from '@/server/admin-actions';
import { adminConfigured, isSignedIn } from '@/server/admin-auth';
import { hrefFor, type Locale } from '@/lib/i18n';
import { isoDateInBerlin } from '@/lib/dates';
import type { Dictionary } from '@/lib/dictionary';

/**
 * The five screens of the back office.
 *
 * Each carries an icon because on a phone these move out of the header and
 * become a bar across the foot of the screen, the same shape the guest side
 * uses. The people who work these screens are standing up with a telephone in
 * one hand — five labelled buttons wrapping onto three rows at the top, which
 * is what this was, ate a fifth of the screen before a single booking showed.
 */
const PAGES = [
  { slug: 'reservierungen', label: 'Reservierungen', short: 'Tische', icon: CalendarIcon },
  { slug: 'bestellungen', label: 'Bestellungen', short: 'Küche', icon: BagIcon },
  { slug: 'zahlungen', label: 'Zahlungen', short: 'Kasse', icon: CardIcon },
  { slug: 'aktionen', label: 'Aktionen', short: 'Aktionen', icon: TagIcon },
  { slug: 'kanaele', label: 'Kanäle', short: 'Kanäle', icon: PlugIcon },
] as const;

/**
 * The back office.
 *
 * Five screens: the book, the kitchen's orders, what has been paid, the offers
 * and the state of the booking platforms. Everything behind one password,
 * nothing linked from the public site, nothing indexed.
 */
export async function AdminView({
  locale,
  dict,
  segments,
  query,
}: {
  locale: Locale;
  dict: Dictionary;
  segments: string[];
  query: Record<string, string | string[] | undefined>;
}) {
  if (segments.length > 1) notFound();
  const page = segments[0] ?? 'reservierungen';
  if (!PAGES.some((entry) => entry.slug === page)) notFound();

  const base = hrefFor(locale, 'admin');

  if (!adminConfigured()) {
    return (
      <div className={styles.gate}>
        <div className={styles.gateBox}>
          <h1 className={styles.gateTitle}>Backoffice nicht eingerichtet</h1>
          {/*
           * Said plainly rather than shown as a login that can never succeed.
           * These screens hold guests' names and telephone numbers; they do not
           * open without a password being set deliberately.
           */}
          <p>
            Diese Seite verwaltet Reservierungen und damit personenbezogene Daten. Sie öffnet sich erst,
            wenn <code>XIGON_ADMIN_PASSWORD</code> in der Umgebung gesetzt ist.
          </p>
          <p className={styles.gateHint}>
            Lokal: eine Datei <code>.env.local</code> mit <code>XIGON_ADMIN_PASSWORD=…</code> anlegen und den
            Server neu starten.
          </p>
        </div>
      </div>
    );
  }

  if (!(await isSignedIn())) {
    return <AdminLogin />;
  }

  const date = typeof query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
    ? query.date
    : isoDateInBerlin();

  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <span className={styles.brand}>XIGON 1987 — Backoffice</span>

        <form action={signOutAction} className={styles.signOutForm}>
          <button type="submit" className={styles.signOut}>
            Abmelden
          </button>
        </form>
      </header>

      {/*
       * One element, two places: in the header on a wide screen, fixed across
       * the foot on a phone. Rendering it once means the current page can never
       * be marked in one copy and not the other.
       */}
      <nav className={styles.tabs} aria-label="Backoffice">
        {PAGES.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.slug}
              href={`${base}/${entry.slug}`}
              className={styles.tab}
              aria-current={page === entry.slug ? 'page' : undefined}
            >
              <span className={styles.tabIcon} aria-hidden="true">
                <Icon />
              </span>
              <span className={styles.tabLabel}>{entry.label}</span>
              <span className={styles.tabShort}>{entry.short}</span>
            </Link>
          );
        })}
      </nav>

      {page === 'reservierungen' ? <AdminBook locale={locale} dict={dict} date={date} /> : null}
      {page === 'bestellungen' ? <AdminOrders locale={locale} date={date} /> : null}
      {page === 'zahlungen' ? <AdminPayments locale={locale} /> : null}
      {page === 'aktionen' ? <AdminPromos /> : null}
      {page === 'kanaele' ? <AdminChannels /> : null}
    </div>
  );
}

/* Line icons at a common box, so the bar reads as one set. */
const box = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' } as const;
const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function CalendarIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <rect x="3.2" y="5" width="17.6" height="16" rx="2" {...stroke} />
      <path d="M3.2 10h17.6M8 3v4M16 3v4" {...stroke} />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <path d="M5 7h14l-1.2 14H6.2L5 7Z" {...stroke} />
      <path d="M8.6 7a3.4 3.4 0 0 1 6.8 0" {...stroke} />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <rect x="2.6" y="5.4" width="18.8" height="13.2" rx="2" {...stroke} />
      <path d="M2.6 9.8h18.8M6.4 14.6h3.6" {...stroke} />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <path d="M11 3H3v8l10 10 8-8L11 3Z" {...stroke} />
      <circle cx="7.4" cy="7.4" r="1.3" {...stroke} />
    </svg>
  );
}

/* The booking platforms: something plugged in from outside. */
function PlugIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <path d="M9 3v5M15 3v5" {...stroke} />
      <path d="M6.4 8h11.2v3a5.6 5.6 0 0 1-11.2 0V8Z" {...stroke} />
      <path d="M12 16.6V21" {...stroke} />
    </svg>
  );
}
