/**
 * The dishes that can stand on the banner.
 *
 * Each entry is a cut-out in /img/plate plus the name that goes with it. The
 * backdrop — the dining room — never changes; only this list does. Adding a new
 * dish to the banner means building one more cut-out and adding one line here.
 *
 * The names are the photographed dishes, not menu entries: the old menu's
 * prices contradict themselves, so nothing here promises a price. Once the
 * catalogue is confirmed, `slug` links a banner dish to its menu page.
 */
import { tr, type Locale } from './i18n';
import type { HeroDish } from '@/components/Hero';

type BannerEntry = {
  plateId: string;
  name: { de: string; en: string; vi: string };
  alt: { de: string; en: string; vi: string };
  slug?: string;
};

/*
 * What stands on the table.
 *
 * Each entry is a transparent cut-out in /img/plate. Adding the next dish is
 * one more line here plus one more line in `scripts/build-assets.mjs` — the
 * room, the table and the lighting never move.
 */
const BANNER: BannerEntry[] = [
  {
    plateId: 'xigon-platter',
    name: { de: 'Das Haus', en: 'The house platter', vi: 'Mâm của quán' },
    alt: {
      de: 'Große Schieferplatte mit Sommerrollen, Gurkensalat, gegrillten Garnelen und dem Schriftzug XIGON 1987 aus Sauce',
      en: 'A large slate platter with summer rolls, cucumber salad, grilled prawns and XIGON 1987 written in sauce',
      vi: 'Mâm đá lớn gồm gỏi cuốn, nộm dưa chuột, tôm nướng và dòng chữ XIGON 1987 vẽ bằng sốt',
    },
  },
];

/** Kept for when the older photographs are cut out against a flat ground too. */
const PENDING: BannerEntry[] = [
  {
    plateId: 'sushi-platter',
    name: { de: 'Sushi-Platte', en: 'Sushi platter', vi: 'Khay sushi' },
    alt: {
      de: 'Große Sushi-Platte mit Maki, Nigiri und Sashimi von oben fotografiert',
      en: 'Large sushi platter with maki, nigiri and sashimi, seen from above',
      vi: 'Khay sushi lớn gồm maki, nigiri và sashimi nhìn từ trên xuống',
    },
  },
  {
    plateId: 'sushi-roll',
    name: { de: 'Maki-Rolle', en: 'Maki roll', vi: 'Cuốn maki' },
    alt: {
      de: 'Sushi-Rolle auf einer Bambusmatte',
      en: 'Sushi roll on a bamboo mat',
      vi: 'Cuốn sushi trên mành tre',
    },
  },
  {
    plateId: 'oysters',
    name: { de: 'Austern', en: 'Oysters', vi: 'Hàu tươi' },
    alt: {
      de: 'Austern mit Kaviar und Limette auf Eis',
      en: 'Oysters with caviar and lime on ice',
      vi: 'Hàu với trứng cá và chanh trên đá',
    },
  },
  {
    plateId: 'drink',
    name: { de: 'Signature Cocktail', en: 'Signature cocktail', vi: 'Cocktail đặc trưng' },
    alt: {
      de: 'Cocktail im Glas vor dunklem Hintergrund',
      en: 'Cocktail in a glass against a dark background',
      vi: 'Ly cocktail trên nền tối',
    },
  },
  {
    plateId: 'dessert',
    name: { de: 'Dessert des Hauses', en: 'Dessert of the house', vi: 'Tráng miệng của quán' },
    alt: {
      de: 'Dessert-Teller, angerichtet',
      en: 'Plated dessert',
      vi: 'Đĩa tráng miệng được bày biện',
    },
  },
];

export function bannerDishes(locale: Locale): HeroDish[] {
  return BANNER.map((entry) => ({
    plateId: entry.plateId,
    name: tr(locale, entry.name),
    alt: tr(locale, entry.alt),
    slug: entry.slug,
  }));
}
