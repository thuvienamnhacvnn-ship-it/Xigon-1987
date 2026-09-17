import { PageHead } from './PageHead';
import styles from './PromoAdminView.module.css';
import viewStyles from './Views.module.css';
import { PromoForm } from '@/components/PromoForm';
import { deletePromotionAction, togglePromotionAction, adminIsOpen } from '@/server/promo-actions';
import { listPromotions } from '@/server/content';
import { formatDate } from '@/lib/dates';
import { tr, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * Uploading and managing offers.
 *
 * Kept out of search indexes and gated in `promo-actions`; the banner at the top
 * says which gate is in force so nobody mistakes an open local screen for a
 * protected one.
 */
export async function PromoAdminView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [promotions, gate] = await Promise.all([listPromotions(locale), adminIsOpen()]);

  return (
    <>
      <PageHead label={dict.promo.label} title={dict.promo.manage} />

      <div className={`section ${viewStyles.plain}`}>
        <div className="shell">
          <p className={styles.gate} data-open={gate.open}>
            {gate.needsPassword
              ? tr(locale, {
                  de: 'Diese Seite ist mit einem Passwort geschützt (XIGON_ADMIN_PASSWORD). Ohne Passwort wird nichts gespeichert.',
                  en: 'This page is password protected (XIGON_ADMIN_PASSWORD). Nothing is saved without it.',
                  vi: 'Trang này được bảo vệ bằng mật khẩu (XIGON_ADMIN_PASSWORD). Không có mật khẩu thì không lưu gì cả.',
                })
              : gate.open
                ? tr(locale, {
                    de: 'Kein Passwort gesetzt. Änderungen sind nur von diesem Rechner aus möglich. Vor dem Livegang XIGON_ADMIN_PASSWORD setzen.',
                    en: 'No password set. Changes are possible only from this machine. Set XIGON_ADMIN_PASSWORD before going live.',
                    vi: 'Chưa đặt mật khẩu. Chỉ sửa được từ chính máy này. Phải đặt XIGON_ADMIN_PASSWORD trước khi lên thật.',
                  })
                : tr(locale, {
                    de: 'Änderungen sind von diesem Gerät aus nicht möglich.',
                    en: 'Changes are not possible from this device.',
                    vi: 'Không thể thay đổi từ thiết bị này.',
                  })}
          </p>

          <div className={styles.layout}>
            <PromoForm locale={locale} dict={dict} needsPassword={gate.needsPassword} />

            <section className={styles.list}>
              <h2 className={viewStyles.h3}>{dict.promo.title}</h2>

              {promotions.length ? (
                <ul className={styles.items}>
                  {promotions.map((promotion) => (
                    <li key={promotion.id} className={styles.item}>
                      {promotion.imagePath ? (
                        <img className={styles.thumb} src={promotion.imagePath} alt="" width={112} height={70} loading="lazy" />
                      ) : (
                        <span className={styles.thumb} aria-hidden="true" />
                      )}

                      <div className={styles.itemBody}>
                        <p className={styles.itemTitle}>{promotion.title}</p>
                        <p className={styles.itemMeta}>
                          {promotion.published ? '● ' : '○ '}
                          {promotion.slug}
                          {promotion.endsAt ? ` · ${formatDate(promotion.endsAt.toISOString().slice(0, 10), locale)}` : ''}
                        </p>
                      </div>

                      <div className={styles.itemActions}>
                        <form action={togglePromotionAction}>
                          <input type="hidden" name="id" value={promotion.id} />
                          <input type="hidden" name="published" value={String(!promotion.published)} />
                          {gate.needsPassword ? <PasswordField locale={locale} /> : null}
                          <button type="submit" className={styles.smallBtn}>
                            {promotion.published
                              ? tr(locale, { de: 'Ausblenden', en: 'Hide', vi: 'Ẩn' })
                              : tr(locale, { de: 'Anzeigen', en: 'Show', vi: 'Hiện' })}
                          </button>
                        </form>

                        <form action={deletePromotionAction}>
                          <input type="hidden" name="id" value={promotion.id} />
                          {gate.needsPassword ? <PasswordField locale={locale} /> : null}
                          <button type="submit" className={styles.deleteBtn}>
                            {tr(locale, { de: 'Löschen', en: 'Delete', vi: 'Xoá' })}
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={viewStyles.empty}>{dict.promo.none}</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Each row acts on its own, so each row carries its own password box when a
 * password is configured. Tedious, but it keeps every write authorised without
 * holding a secret in a cookie.
 */
function PasswordField({ locale }: { locale: Locale }) {
  return (
    <input
      type="password"
      name="password"
      className={styles.rowPassword}
      autoComplete="off"
      placeholder={tr(locale, { de: 'Passwort', en: 'Password', vi: 'Mật khẩu' })}
      aria-label={tr(locale, { de: 'Passwort', en: 'Password', vi: 'Mật khẩu' })}
    />
  );
}
