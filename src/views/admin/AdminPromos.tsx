import styles from './Admin.module.css';
import { NewPromo } from './NewPromo';
import { PromoRowActions } from './PromoRowActions';
import type { PromoDraft } from './PromoEditor';
import { listPromotions } from '@/server/content';
import { RESTAURANT } from '@/lib/restaurant';

/**
 * The offers, all of them.
 *
 * Including the ones the website is not showing — an offer that has expired or
 * was never published is exactly what someone comes here to find, and a list
 * that hid them would send them looking in the database. Each row says in words
 * why it is or is not live, because "published" alone is only half the answer:
 * a published offer whose end date has passed is just as invisible.
 */

const STAMP = new Intl.DateTimeFormat('de-DE', {
  timeZone: RESTAURANT.timezone,
  dateStyle: 'short',
  timeStyle: 'short',
});

/** The Berlin wall clock an `<input type="datetime-local">` expects. */
const INPUT_VALUE = new Intl.DateTimeFormat('sv-SE', {
  timeZone: RESTAURANT.timezone,
  dateStyle: 'short',
  timeStyle: 'short',
});

function forInput(at: Date | null): string {
  return at ? INPUT_VALUE.format(at).replace(' ', 'T') : '';
}

export async function AdminPromos() {
  // German only, like the rest of the back office; the form edits all three
  // languages column by column anyway.
  const rows = await listPromotions('de');
  const now = new Date();

  return (
    <div className={styles.page}>
      <header className={styles.dayHead}>
        <div>
          <p className={styles.dayLabel}>Aktionen</p>
          <p className={styles.dayCounts}>
            <strong>{rows.length}</strong> insgesamt ·{' '}
            <strong>{rows.filter((row) => isLive(row, now)).length}</strong> gerade auf der Website
          </p>
        </div>
      </header>

      <NewPromo />

      {rows.length === 0 ? (
        <p className={styles.empty}>Noch keine Aktion angelegt.</p>
      ) : (
        <ul className={styles.rows}>
          {rows.map((row, index) => {
            const live = isLive(row, now);
            const draft: PromoDraft = {
              id: row.id,
              titleDe: row.titleDe,
              titleEn: row.titleEn ?? '',
              titleVi: row.titleVi ?? '',
              bodyDe: row.bodyDe ?? '',
              bodyEn: row.bodyEn ?? '',
              bodyVi: row.bodyVi ?? '',
              startsAt: forInput(row.startsAt),
              endsAt: forInput(row.endsAt),
              sort: row.sort,
              published: row.published,
              imagePath: row.imagePath,
            };

            return (
              <li key={row.id} className={styles.promoRow} data-state={live ? undefined : 'off'}>
                {row.imagePath ? (
                  <img
                    className={styles.promoThumb}
                    src={row.imagePath}
                    alt=""
                    width={132}
                    height={84}
                    loading="lazy"
                  />
                ) : (
                  <span className={styles.promoThumb} data-empty="true" aria-hidden="true" />
                )}

                <div className={styles.promoBody}>
                  <p className={styles.promoTitle}>
                    {row.titleDe}
                    <span className={styles.promoOrder}>#{row.sort}</span>
                  </p>
                  <p className={styles.promoMeta}>
                    {row.startsAt ? `ab ${STAMP.format(row.startsAt)}` : 'ab sofort'}
                    {' · '}
                    {row.endsAt ? `bis ${STAMP.format(row.endsAt)}` : 'ohne Ende'}
                  </p>
                  <p className={styles.promoMeta}>
                    {row.titleEn ? 'EN' : '—'} · {row.titleVi ? 'VI' : '—'} · {row.slug}
                  </p>
                </div>

                <p className={styles.promoState} data-live={live}>
                  {stateLabel(row, now)}
                </p>

                <div className={styles.promoCell}>
                  <PromoRowActions draft={draft} first={index === 0} last={index === rows.length - 1} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type Row = { published: boolean; startsAt: Date | null; endsAt: Date | null };

/** The same three conditions `getLivePromotions` applies, said back to staff. */
function isLive(row: Row, now: Date): boolean {
  if (!row.published) return false;
  if (row.startsAt && row.startsAt > now) return false;
  if (row.endsAt && row.endsAt <= now) return false;
  return true;
}

function stateLabel(row: Row, now: Date): string {
  if (!row.published) return 'Entwurf';
  if (row.endsAt && row.endsAt <= now) return 'abgelaufen';
  if (row.startsAt && row.startsAt > now) return 'geplant';
  return 'live';
}
