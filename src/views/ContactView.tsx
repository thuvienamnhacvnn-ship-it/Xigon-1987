import { PageHead } from './PageHead';
import styles from './ContactView.module.css';
import viewStyles from './Views.module.css';
import { MapCard } from '@/components/MapCard';
import { HOURS_SOURCES, RESTAURANT, phoneHref } from '@/lib/restaurant';
import { formatMinute } from '@/lib/dates';
import { tr, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

export async function ContactView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <>
      <PageHead label={dict.nav.contact} title={dict.contact.title} />

      <div className={`section ${viewStyles.plain}`}>
        <div className="shell">
          <div className={styles.layout}>
            <div className={styles.details}>
              <section className={styles.block}>
                <h2 className="label">{dict.contact.address}</h2>
                <p className={styles.big}>
                  {RESTAURANT.street}
                  <br />
                  {RESTAURANT.postalCode} {RESTAURANT.city}
                </p>
                <p className={styles.meta}>{RESTAURANT.transit}</p>
              </section>

              <section className={styles.block}>
                <h2 className="label">{dict.contact.phone}</h2>
                <a className={styles.big} href={phoneHref(RESTAURANT.phone)}>
                  {RESTAURANT.phone}
                </a>
              </section>

              <section className={styles.block}>
                <h2 className="label">{dict.contact.email}</h2>
                <a className={styles.link} href={`mailto:${RESTAURANT.email}`}>
                  {RESTAURANT.email}
                </a>
                <a className={styles.link} href={`mailto:${RESTAURANT.eventEmail}`}>
                  {RESTAURANT.eventEmail}
                </a>
                <p className={styles.meta}>
                  {tr(locale, {
                    de: 'Die zweite Adresse ist die aus der Event-Anfrage der alten Website.',
                    en: 'The second address is the one from the old site’s event enquiry.',
                    vi: 'Địa chỉ thứ hai lấy từ trang hỏi đặt sự kiện của web cũ.',
                  })}
                </p>
              </section>

              <section className={styles.block}>
                <h2 className="label">{dict.contact.hours}</h2>
                {/*
                 * Two published sets, in flat contradiction. Both are shown with
                 * their source rather than one being picked as the truth.
                 */}
                <ul className={styles.hours}>
                  {HOURS_SOURCES.map((source) => (
                    <li key={source.id}>
                      <span className={styles.hoursTime}>
                        {formatMinute(source.opensMinute)} – {formatMinute(source.closesMinute)}
                      </span>
                      <a className={styles.hoursSource} href={source.url} target="_blank" rel="noreferrer noopener">
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className={styles.warn}>{dict.contact.hoursPending}</p>
              </section>

              <section className={styles.block}>
                <h2 className="label">{dict.footer.follow}</h2>
                <a className={styles.link} href={RESTAURANT.instagram} target="_blank" rel="noreferrer noopener">
                  Instagram
                </a>
                <a className={styles.link} href={RESTAURANT.facebook} target="_blank" rel="noreferrer noopener">
                  Facebook
                </a>
              </section>
            </div>

            <div className={styles.mapCol}>
              <MapCard dict={dict} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
