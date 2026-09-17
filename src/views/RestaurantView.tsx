import Link from 'next/link';
import { PageHead } from './PageHead';
import styles from './RestaurantView.module.css';
import viewStyles from './Views.module.css';
import { Scene } from '@/components/Picture';
import { ReviewsSection } from '@/components/Sections';
import { getReviews } from '@/server/content';
import { hrefFor, tr, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * The room.
 *
 * Photographs from the restaurant's own site, captioned with what they actually
 * show. No claim about the year, the founders or the story: the name says 1987
 * and nothing anyone has confirmed says what that refers to, so the page does
 * not invent a history.
 */

const PLATES: { id: string; caption: { de: string; en: string; vi: string } }[] = [
  {
    id: 'dining-room',
    caption: {
      de: 'Der Gastraum: lange Tische unter dem Holzgewölbe.',
      en: 'The dining room: long tables under the timber vault.',
      vi: 'Phòng ăn: những dãy bàn dài dưới vòm gỗ.',
    },
  },
  {
    id: 'lanterns-bar',
    caption: {
      de: 'Seidenlaternen über der Bar.',
      en: 'Silk lanterns above the bar.',
      vi: 'Đèn lồng lụa trên quầy bar.',
    },
  },
  {
    id: 'neon-logo-wall',
    caption: {
      de: 'Das Neon-Zeichen im Gastraum.',
      en: 'The neon mark in the dining room.',
      vi: 'Biển neon trong phòng ăn.',
    },
  },
  {
    id: 'cabinet-detail',
    caption: {
      de: 'Vitrine und Messinggitter.',
      en: 'Display cabinet and brass grille.',
      vi: 'Tủ trưng bày và lưới đồng.',
    },
  },
  {
    id: 'sushi-bench',
    caption: {
      de: 'An der Sushi-Bank wird vor den Gästen gearbeitet.',
      en: 'At the sushi bench, the work happens in front of you.',
      vi: 'Tại quầy sushi, đầu bếp làm ngay trước mặt khách.',
    },
  },
  {
    id: 'interior-colour',
    caption: {
      de: 'Der Raum am Abend, im farbigen Licht.',
      en: 'The room in the evening, under colour.',
      vi: 'Không gian buổi tối dưới ánh đèn màu.',
    },
  },
];

export async function RestaurantView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const reviews = await getReviews(locale);

  return (
    <>
      <PageHead label={dict.space.label} title={dict.space.title} text={dict.space.text} />

      <div className={`section ${viewStyles.plain}`}>
        <div className="shell">
          <div className={styles.plates}>
            {PLATES.map((plate, index) => (
              <figure key={plate.id} className={styles.plate} data-reveal>
                <Scene
                  id={plate.id}
                  alt={tr(locale, plate.caption)}
                  sizes="(min-width: 900px) 46vw, 92vw"
                  className={styles.image}
                  priority={index === 0}
                />
                <figcaption className={styles.caption}>{tr(locale, plate.caption)}</figcaption>
              </figure>
            ))}
          </div>

          {/* The photographs show identifiable guests and staff; saying where
              they came from is the minimum honesty this page owes. */}
          <p className={styles.credit}>
            {tr(locale, {
              de: 'Alle Aufnahmen stammen von der Website des Restaurants. Rechte und Einwilligungen der abgebildeten Personen sind vor einer Veröffentlichung zu klären.',
              en: 'All photographs come from the restaurant’s own website. Rights and the consent of the people shown must be settled before publication.',
              vi: 'Toàn bộ ảnh lấy từ website của chính nhà hàng. Quyền sử dụng và sự đồng ý của những người trong ảnh phải được xác nhận trước khi xuất bản.',
            })}
          </p>

          <div className={styles.cta}>
            <Link href={hrefFor(locale, 'reserve')} className="btn btn--gold">
              {dict.nav.reserve}
            </Link>
            <Link href={hrefFor(locale, 'contact')} className="linkArrow">
              {dict.nav.contact}
            </Link>
          </div>
        </div>
      </div>

      <ReviewsSection reviews={reviews} dict={dict} />
    </>
  );
}
