'use client';

import { useActionState, useRef, useState } from 'react';
import styles from './PromoForm.module.css';
import { savePromotionAction, type PromoState } from '@/server/promo-actions';
import { tr, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * Uploading an offer.
 *
 * A real multipart form posting to a server action: the file goes straight to
 * the server, which checks its type by magic bytes and gives it a name of its
 * own. The preview is local and never leaves the browser.
 */
export function PromoForm({
  locale,
  dict,
  needsPassword,
}: {
  locale: Locale;
  dict: Dictionary;
  needsPassword: boolean;
}) {
  const [state, action, pending] = useActionState<PromoState, FormData>(savePromotionAction, { status: 'idle' });
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const errors: Record<string, { de: string; en: string; vi: string }> = {
    forbidden: {
      de: 'Nicht berechtigt. Bitte Passwort prüfen.',
      en: 'Not authorised. Check the password.',
      vi: 'Không có quyền. Kiểm tra lại mật khẩu.',
    },
    invalid: {
      de: 'Bitte mindestens einen deutschen Titel angeben.',
      en: 'Please give at least a German title.',
      vi: 'Cần ít nhất một tiêu đề tiếng Đức.',
    },
    type: {
      de: 'Nur JPG, PNG oder WebP.',
      en: 'JPG, PNG or WebP only.',
      vi: 'Chỉ nhận JPG, PNG hoặc WebP.',
    },
    size: {
      de: 'Die Datei ist größer als 6 MB.',
      en: 'The file is larger than 6 MB.',
      vi: 'Tệp lớn hơn 6 MB.',
    },
    unreadable: {
      de: 'Die Datei konnte nicht gelesen werden.',
      en: 'The file could not be read.',
      vi: 'Không đọc được tệp.',
    },
  };

  return (
    <form
      ref={formRef}
      action={(formData) => {
        action(formData);
        setPreview(null);
        formRef.current?.reset();
      }}
      className={styles.form}
    >
      <h2 className={styles.title}>{dict.promo.manage}</h2>

      <div className={styles.imageRow}>
        <label className={styles.drop} htmlFor="promo-image">
          {preview ? (
            <img src={preview} alt="" className={styles.preview} />
          ) : (
            <span className={styles.dropText}>
              {tr(locale, {
                de: 'Bild wählen — JPG, PNG oder WebP, max. 6 MB',
                en: 'Choose an image — JPG, PNG or WebP, max 6 MB',
                vi: 'Chọn ảnh — JPG, PNG hoặc WebP, tối đa 6 MB',
              })}
            </span>
          )}
        </label>
        <input
          id="promo-image"
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          className="visually-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
      </div>

      <div className="field">
        <label htmlFor="promo-title-de">Titel (DE) *</label>
        <input id="promo-title-de" name="titleDe" className="input" maxLength={120} required />
      </div>

      <div className={styles.pair}>
        <div className="field">
          <label htmlFor="promo-title-en">Title (EN)</label>
          <input id="promo-title-en" name="titleEn" className="input" maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="promo-title-vi">Tiêu đề (VI)</label>
          <input id="promo-title-vi" name="titleVi" className="input" maxLength={120} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="promo-body-de">Text (DE)</label>
        <textarea id="promo-body-de" name="bodyDe" className="textarea" maxLength={1200} />
      </div>

      <div className={styles.pair}>
        <div className="field">
          <label htmlFor="promo-body-en">Text (EN)</label>
          <textarea id="promo-body-en" name="bodyEn" className="textarea" maxLength={1200} />
        </div>
        <div className="field">
          <label htmlFor="promo-body-vi">Nội dung (VI)</label>
          <textarea id="promo-body-vi" name="bodyVi" className="textarea" maxLength={1200} />
        </div>
      </div>

      <div className={styles.pair}>
        <div className="field">
          <label htmlFor="promo-starts">
            {tr(locale, { de: 'Läuft ab', en: 'Runs from', vi: 'Bắt đầu' })}
          </label>
          <input id="promo-starts" name="startsAt" type="datetime-local" className="input" />
        </div>
        <div className="field">
          <label htmlFor="promo-ends">
            {tr(locale, { de: 'Läuft bis', en: 'Runs until', vi: 'Kết thúc' })}
          </label>
          <input id="promo-ends" name="endsAt" type="datetime-local" className="input" />
          <p className="field-hint">
            {tr(locale, {
              de: 'Mit Enddatum zeigt die Startseite einen Countdown.',
              en: 'With an end date the home page shows a countdown.',
              vi: 'Có ngày kết thúc thì trang chủ hiện đồng hồ đếm ngược.',
            })}
          </p>
        </div>
      </div>

      {needsPassword ? (
        <div className="field">
          <label htmlFor="promo-password">{tr(locale, { de: 'Passwort', en: 'Password', vi: 'Mật khẩu' })}</label>
          <input id="promo-password" name="password" type="password" className="input" autoComplete="off" />
        </div>
      ) : null}

      <label className={styles.checkbox}>
        <input type="checkbox" name="published" defaultChecked />
        <span>{tr(locale, { de: 'Sofort veröffentlichen', en: 'Publish immediately', vi: 'Đăng ngay' })}</span>
      </label>

      {state.status === 'error' ? (
        <p className={styles.error} role="alert">
          {tr(locale, errors[state.message] ?? errors.invalid)}
        </p>
      ) : null}
      {state.status === 'saved' ? (
        <p className={styles.ok} role="status">
          {tr(locale, {
            de: `„${state.title}“ gespeichert.`,
            en: `“${state.title}” saved.`,
            vi: `Đã lưu „${state.title}“.`,
          })}
        </p>
      ) : null}

      <button type="submit" className="btn btn--gold btn--block" disabled={pending}>
        {pending ? dict.common.loading : dict.promo.manage}
      </button>
    </form>
  );
}
