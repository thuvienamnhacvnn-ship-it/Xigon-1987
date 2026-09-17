import Link from 'next/link';
import styles from './Footer.module.css';
import { BotanicalBranch, Seal } from './Botanical';
import { MapCard } from './MapCard';
import { hrefFor, type Locale, type RouteKey } from '@/lib/i18n';
import { RESTAURANT, HOURS_SOURCES, phoneHref } from '@/lib/restaurant';
import { formatMinute } from '@/lib/dates';
import type { Dictionary } from '@/lib/dictionary';

const EXPLORE: { key: RouteKey; label: (d: Dictionary) => string }[] = [
  { key: 'menu', label: (d) => d.nav.menu },
  { key: 'restaurant', label: (d) => d.nav.restaurant },
  { key: 'contact', label: (d) => d.nav.contact },
];

const SERVICE: { key: RouteKey; label: (d: Dictionary) => string }[] = [
  { key: 'reserve', label: (d) => d.nav.reserve },
  { key: 'order', label: (d) => d.nav.order },
  { key: 'cart', label: (d) => d.nav.cart },
];

const LEGAL: { key: RouteKey; label: (d: Dictionary) => string }[] = [
  { key: 'imprint', label: (d) => d.footer.imprint },
  { key: 'privacy', label: (d) => d.footer.privacy },
  { key: 'orderTerms', label: (d) => d.footer.terms },
];

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className={styles.footer}>
      <BotanicalBranch className={styles.leafLeft} />
      <BotanicalBranch className={styles.leafRight} />

      <div className="shell">
        <div className={styles.top}>
          {/* --- the house --- */}
          <div className={styles.brandCol}>
            <img src="/img/logo.png" alt={RESTAURANT.name} width={132} height={44} className={styles.logo} />
            <p className={styles.motto}>{dict.rail.motto}</p>
            <Seal className={styles.seal} />
          </div>

          {/* --- the way here --- */}
          <div className={styles.mapCol}>
            <p className="label">{dict.contact.transit}</p>
            <MapCard dict={dict} />
          </div>

          {/* --- reaching us --- */}
          <div className={styles.infoCol}>
            <p className="label">{dict.contact.hours}</p>
            <ul className={styles.hours}>
              {HOURS_SOURCES.map((source) => (
                <li key={source.id}>
                  <span className={styles.hoursTime}>
                    {formatMinute(source.opensMinute)} – {formatMinute(source.closesMinute)}
                  </span>
                  <span className={styles.hoursNote}>{source.label}</span>
                </li>
              ))}
            </ul>
            {/* Two published sets contradict each other; we say so instead of picking one. */}
            <p className={styles.pending}>{dict.contact.hoursPending}</p>

            <hr className="rule rule--wide" />

            <p className="label">{dict.contact.phone}</p>
            <a className={styles.big} href={phoneHref(RESTAURANT.phone)}>
              {RESTAURANT.phone}
            </a>
            <a className={styles.mail} href={`mailto:${RESTAURANT.email}`}>
              {RESTAURANT.email}
            </a>
          </div>
        </div>

        <div className={styles.links}>
          <nav aria-label={dict.footer.explore}>
            <p className="label">{dict.footer.explore}</p>
            {EXPLORE.map((item) => (
              <Link key={item.key} href={hrefFor(locale, item.key)} className={styles.link}>
                {item.label(dict)}
              </Link>
            ))}
          </nav>

          <nav aria-label={dict.footer.service}>
            <p className="label">{dict.footer.service}</p>
            {SERVICE.map((item) => (
              <Link key={item.key} href={hrefFor(locale, item.key)} className={styles.link}>
                {item.label(dict)}
              </Link>
            ))}
          </nav>

          <nav aria-label={dict.footer.legal}>
            <p className="label">{dict.footer.legal}</p>
            {LEGAL.map((item) => (
              <Link key={item.key} href={hrefFor(locale, item.key)} className={styles.link}>
                {item.label(dict)}
              </Link>
            ))}
          </nav>

          <div>
            <p className="label">{dict.footer.follow}</p>
            <a className={styles.link} href={RESTAURANT.instagram} target="_blank" rel="noreferrer noopener">
              Instagram
            </a>
            <a className={styles.link} href={RESTAURANT.facebook} target="_blank" rel="noreferrer noopener">
              Facebook
            </a>
            <a className={styles.link} href={`mailto:${RESTAURANT.eventEmail}`}>
              {RESTAURANT.eventEmail}
            </a>
          </div>
        </div>

        <div className={styles.base}>
          <p>
            © {new Date().getFullYear()} {RESTAURANT.name}. {dict.footer.rights}
          </p>
          {RESTAURANT.demoMode ? <p className={styles.demo}>{dict.footer.demo}</p> : null}
        </div>
      </div>
    </footer>
  );
}
