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
 * The back office.
 *
 * Two screens: the book, and the state of the booking platforms. Everything
 * behind one password, nothing linked from the public site, nothing indexed.
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
  const PAGES = ['reservierungen', 'bestellungen', 'zahlungen', 'aktionen', 'kanaele'] as const;
  if (!(PAGES as readonly string[]).includes(page)) notFound();

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

        <nav className={styles.tabs}>
          <Link
            href={`${base}/reservierungen`}
            className={styles.tab}
            aria-current={page === 'reservierungen' ? 'page' : undefined}
          >
            Reservierungen
          </Link>
          <Link
            href={`${base}/bestellungen`}
            className={styles.tab}
            aria-current={page === 'bestellungen' ? 'page' : undefined}
          >
            Bestellungen
          </Link>
          <Link
            href={`${base}/zahlungen`}
            className={styles.tab}
            aria-current={page === 'zahlungen' ? 'page' : undefined}
          >
            Zahlungen
          </Link>
          <Link
            href={`${base}/aktionen`}
            className={styles.tab}
            aria-current={page === 'aktionen' ? 'page' : undefined}
          >
            Aktionen
          </Link>
          <Link href={`${base}/kanaele`} className={styles.tab} aria-current={page === 'kanaele' ? 'page' : undefined}>
            Kanäle
          </Link>
        </nav>

        <form action={signOutAction}>
          <button type="submit" className={styles.signOut}>
            Abmelden
          </button>
        </form>
      </header>

      {page === 'reservierungen' ? <AdminBook locale={locale} dict={dict} date={date} /> : null}
      {page === 'bestellungen' ? <AdminOrders locale={locale} date={date} /> : null}
      {page === 'zahlungen' ? <AdminPayments locale={locale} /> : null}
      {page === 'aktionen' ? <AdminPromos /> : null}
      {page === 'kanaele' ? <AdminChannels /> : null}
    </div>
  );
}
