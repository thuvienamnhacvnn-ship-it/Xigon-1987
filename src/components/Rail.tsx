'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Rail.module.css';
import { hrefFor, localeShort, locales, switchPath, type Locale, type RouteKey } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

const NAV: { key: RouteKey; label: (d: Dictionary) => string }[] = [
  { key: 'menu', label: (d) => d.nav.menu },
  { key: 'restaurant', label: (d) => d.nav.restaurant },
  { key: 'promoAdmin', label: (d) => d.promo.label },
  { key: 'contact', label: (d) => d.nav.contact },
];

/**
 * The fixed black rail down the left edge.
 *
 * It is the signature of the layout and it carries the navigation, so below
 * 1100px it is removed and the bar at the top takes over — the same links, not
 * a squashed 168px column.
 */
export function Rail({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname();

  const isCurrent = (key: RouteKey) => {
    const href = hrefFor(locale, key);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className={styles.rail}>
      <Link href={hrefFor(locale, 'home')} className={styles.brand}>
        {/* The restaurant's own mark, on black, so it keeps its gold. */}
        <img src="/img/logo.png" alt={dict.brand.name} width={112} height={38} className={styles.logo} />
        <span className={styles.tagline}>
          {dict.rail.tags.slice(0, 2).join(' · ')}
          <br />
          {dict.brand.city}
        </span>
      </Link>

      <span className={styles.hair} />

      <nav className={styles.nav} aria-label={dict.nav.menu}>
        {NAV.map((item) => (
          <Link
            key={item.key}
            href={hrefFor(locale, item.key)}
            className={styles.navLink}
            aria-current={isCurrent(item.key) ? 'page' : undefined}
          >
            {item.label(dict)}
          </Link>
        ))}
      </nav>

      <span className={styles.hair} />

      {/*
       * The engraving from the template, cut to transparency by the asset
       * build. It is decoration and nothing else, so it is hidden from
       * assistive technology rather than given an empty description.
       */}
      <img
        src="/img/layer/botanical-420.webp"
        alt=""
        aria-hidden="true"
        width={420}
        height={1028}
        className={styles.botanical}
        loading="lazy"
      />

      <div className={styles.foot}>
        <span className={styles.hair} />

        <div className={styles.langs} role="group" aria-label={dict.nav.language}>
          {locales.map((code) => (
            <Link
              key={code}
              href={code === locale ? pathname : switchPath(pathname, locale, code)}
              hrefLang={code}
              aria-current={code === locale ? 'true' : undefined}
              className={styles.lang}
            >
              {localeShort[code]}
            </Link>
          ))}
        </div>

        <p className={styles.motto}>{dict.rail.motto}</p>
      </div>
    </aside>
  );
}
