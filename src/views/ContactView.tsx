import Link from 'next/link';
import styles from './ContactView.module.css';
import { EdgeLight } from '@/components/app/EdgeLight';
import { MapPlate } from '@/components/app/MapPlate';
import { HOURS_SOURCES, RESTAURANT, phoneHref } from '@/lib/restaurant';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * Kontakt — the way to the door.
 *
 * Three columns: what we know, where it is, and how to carry it away in a
 * pocket. The opening hours are shown as two contradicting sources rather than
 * as one confident answer, because that is what the restaurant's own channels
 * publish and picking one of them would be inventing a fact.
 */
export function ContactView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const address = `${RESTAURANT.street}, ${RESTAURANT.postalCode} ${RESTAURANT.city}`;
  const route = `https://www.openstreetmap.org/directions?to=${encodeURIComponent(
    `${RESTAURANT.name}, ${address}`,
  )}`;

  return (
    <div className={`glass screen-sheet ${styles.screen}`}>
      <EdgeLight />
      <div className={styles.columns}>
        {/* ---------- what we know ---------- */}
        <section className={styles.facts}>
          <p className="label">{dict.contact.title}</p>
          <h1 className={styles.title}>{dict.contact.wayToUs}</h1>
          <p className={styles.lede}>{dict.contact.welcome}</p>

          <ul className={styles.rows}>
            <Row icon={<PinIcon />} title={`${RESTAURANT.name} · ${RESTAURANT.city}`}>
              {address}
              <span className={styles.sub}>{RESTAURANT.transit}</span>
            </Row>

            <Row icon={<ClockIcon />} title={dict.contact.hours}>
              {/*
               * Both published sets, each with its source. The old site says
               * 11:00–23:00 on one page and 10:00–01:00 on another; until the
               * restaurant settles it, showing one of them as the answer would
               * send somebody to a locked door.
               */}
              {HOURS_SOURCES.map((source) => (
                <span key={source.id} className={styles.hoursRow}>
                  {formatSpan(source.opensMinute, source.closesMinute)}
                  <a href={source.url} className={styles.source} target="_blank" rel="noreferrer noopener">
                    {source.label}
                  </a>
                </span>
              ))}
              <span className={styles.sub}>{dict.contact.hoursPending}</span>
            </Row>

            <Row icon={<PhoneIcon />} title={dict.contact.phone}>
              <a href={phoneHref(RESTAURANT.phone)} className={styles.strong}>
                {RESTAURANT.phone}
              </a>
              <a href={`mailto:${RESTAURANT.email}`} className={styles.sub}>
                {RESTAURANT.email}
              </a>
            </Row>
          </ul>

          <div className={styles.actions}>
            <a href={phoneHref(RESTAURANT.phone)} className={styles.action}>
              <PhoneIcon />
              {dict.contact.call}
            </a>
            <a href={`mailto:${RESTAURANT.email}`} className={styles.action}>
              <MailIcon />
              {dict.contact.email}
            </a>
            <a href={route} className={styles.action} target="_blank" rel="noreferrer noopener">
              <RouteIcon />
              {dict.contact.directions}
            </a>
          </div>
        </section>

        {/* ---------- where it is ---------- */}
        <section className={styles.map}>
          <MapPlate dict={dict} />
        </section>

        {/* ---------- in a pocket ---------- */}
        <section className={styles.pocket}>
          <img className={styles.qr} src="/img/qr/route.svg" alt={dict.contact.qrAlt} width={180} height={180} />
          <p className={styles.qrTitle}>{dict.contact.qrTitle}</p>
          <p className={styles.qrText}>{dict.contact.qrText}</p>

          <a href={route} className={styles.qrRoute} target="_blank" rel="noreferrer noopener">
            <span className={styles.qrMark} aria-hidden="true">
              <PhoneIcon />
            </span>
            {dict.contact.qrRoute}
          </a>
        </section>
      </div>

      {/* ---------- the footer row, inside the panel as drawn ---------- */}
      <footer className={styles.foot}>
        <span className={styles.wordmark}>
          <b>XIGON</b>
          <span>— 1987 —</span>
          <span>{RESTAURANT.city}</span>
        </span>

        <span className={styles.footRule} aria-hidden="true" />

        <span className={styles.social}>
          <a href={RESTAURANT.instagram} target="_blank" rel="noreferrer noopener" aria-label="Instagram">
            <InstagramIcon />
          </a>
          <a href={RESTAURANT.facebook} target="_blank" rel="noreferrer noopener" aria-label="Facebook">
            <FacebookIcon />
          </a>
        </span>

        <span className={styles.footRule} aria-hidden="true" />

        <nav className={styles.legal}>
          <Link href={hrefFor(locale, 'imprint')}>{dict.footer.imprint}</Link>
          <Link href={hrefFor(locale, 'privacy')}>{dict.footer.privacy}</Link>
          <Link href={hrefFor(locale, 'orderTerms')}>{dict.footer.terms}</Link>
        </nav>
      </footer>
    </div>
  );
}

function Row({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className={styles.row}>
      <span className={styles.rowIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{title}</span>
        {children}
      </span>
    </li>
  );
}

/** 25 * 60 is one in the morning, not twenty-five o'clock. */
function formatSpan(opens: number, closes: number): string {
  const clock = (minute: number) => {
    const hour = Math.floor(minute / 60) % 24;
    const rest = minute % 60;
    return `${String(hour).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  };
  return `${clock(opens)} – ${clock(closes)}`;
}

const line = { stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function PinIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" {...line} />
      <circle cx="12" cy="10" r="2.6" {...line} />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" {...line} />
      <path d="M12 7.2V12l3.2 2" {...line} />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.4 3.6h3.1l1.5 3.9-2.2 1.4a11.4 11.4 0 0 0 5.3 5.3l1.4-2.2 3.9 1.5v3.1a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.4 5.8a2 2 0 0 1 2-2.2Z"
        {...line}
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.8" y="5.2" width="18.4" height="13.6" rx="2" {...line} />
      <path d="m3.4 7 8.6 6 8.6-6" {...line} />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 3 10.5 21l-2.2-7.3L1 11.5 21 3Z" {...line} />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" {...line} strokeWidth={1.4} />
      <circle cx="12" cy="12" r="4.1" {...line} strokeWidth={1.4} />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.25-1.5 1.5-1.5H17.7V4.3A20 20 0 0 0 15.4 4.2c-2.3 0-3.9 1.4-3.9 4v2.2H8.9v3h2.6V21h3.1Z"
        fill="currentColor"
      />
    </svg>
  );
}
