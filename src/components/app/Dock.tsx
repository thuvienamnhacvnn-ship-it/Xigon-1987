'use client';

import Link from 'next/link';
import styles from './AppShell.module.css';
import { dockKeyFrom, hrefFor, type Locale, type RouteKey } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * The seven screens, always reachable.
 *
 * Icon and label together — an icon alone is a guessing game, and this dock is
 * the only navigation the site has. Exactly one item is current at a time, and
 * it is marked twice over: gold type and a dot beneath, so it does not rely on
 * colour alone.
 */
const ITEMS: { key: RouteKey; label: (d: Dictionary) => string; icon: () => React.ReactElement }[] = [
  { key: 'experience', label: (d) => d.dock.experience, icon: EyeIcon },
  { key: 'menu', label: (d) => d.dock.menu, icon: CutleryIcon },
  { key: 'reserve', label: (d) => d.dock.reserve, icon: CalendarIcon },
  { key: 'order', label: (d) => d.dock.order, icon: BagIcon },
  { key: 'offers', label: (d) => d.dock.offers, icon: TagIcon },
  { key: 'assistant', label: (d) => d.dock.assistant, icon: BrainIcon },
  { key: 'contact', label: (d) => d.dock.contact, icon: MailIcon },
];

export function Dock({
  locale,
  dict,
  current,
}: {
  locale: Locale;
  dict: Dictionary;
  current: RouteKey | null;
}) {
  const owner = dockKeyFrom(current);

  return (
    <nav className={styles.dock} aria-label={dict.nav.menu}>
      <ul className={styles.dockList}>
        {ITEMS.map((item) => {
          const active = item.key === owner;
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <Link
                href={hrefFor(locale, item.key)}
                className={styles.dockItem}
                aria-current={active ? 'page' : undefined}
              >
                <Icon />
                <span className={styles.dockLabel}>{item.label(dict)}</span>
                <span className={styles.dockDot} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* Line icons at a common 22px box, so the row reads as one set. */
const box = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' } as const;
const stroke = { stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function EyeIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <path d="M1.8 12S5.5 5.5 12 5.5 22.2 12 22.2 12 18.5 18.5 12 18.5 1.8 12 1.8 12Z" {...stroke} />
      <circle cx="12" cy="12" r="3.1" {...stroke} />
    </svg>
  );
}

function CutleryIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <path d="M7 3v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3M9 12v9M7 3v4M11 3v4" {...stroke} />
      <path d="M17 3c-1.4 1.2-2 3-2 5s.7 2.8 2 3v10" {...stroke} />
    </svg>
  );
}

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

function TagIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <path d="M11 3H3v8l10 10 8-8L11 3Z" {...stroke} />
      <circle cx="7.4" cy="7.4" r="1.3" {...stroke} />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <path
        d="M9.5 4.2A2.7 2.7 0 0 0 6.8 7a2.6 2.6 0 0 0-1.6 4.5A2.7 2.7 0 0 0 6.8 16a2.7 2.7 0 0 0 2.7 2.8c.8 0 1.5-.4 2-.9V5.1c-.5-.5-1.2-.9-2-.9ZM14.5 4.2A2.7 2.7 0 0 1 17.2 7a2.6 2.6 0 0 1 1.6 4.5A2.7 2.7 0 0 1 17.2 16a2.7 2.7 0 0 1-2.7 2.8c-.8 0-1.5-.4-2-.9V5.1c.5-.5 1.2-.9 2-.9Z"
        {...stroke}
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...box} aria-hidden="true">
      <rect x="2.8" y="5.2" width="18.4" height="13.6" rx="2" {...stroke} />
      <path d="m3.4 7 8.6 6 8.6-6" {...stroke} />
    </svg>
  );
}
