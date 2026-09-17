import { MenuBoard } from '@/components/app/MenuBoard';
import { getMenu } from '@/server/menu';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';

/**
 * Speisekarte — the screen the restaurant is judged on.
 *
 * The rows come from the database and go nowhere else: the same objects feed
 * the card, the dish panel, the basket and the menu guide, so a price can never
 * be right in one place and stale in another.
 */
export async function MenuView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const categories = await getMenu(locale);

  if (!categories.length) {
    return <p className="screen-empty">{dict.menu.unpublished}</p>;
  }

  return <MenuBoard locale={locale} dict={dict} categories={categories} />;
}
