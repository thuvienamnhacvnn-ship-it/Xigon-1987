import { notFound } from 'next/navigation';
import { EdgeLight } from '@/components/app/EdgeLight';
import { getDictionary } from '@/lib/dictionary';
import { isLocale, matchRoute, routes, type RouteKey } from '@/lib/i18n';
import { AssistantView } from '@/views/AssistantView';
import { CartView } from '@/views/CartView';
import { ExperienceView } from '@/views/ExperienceView';
import { CheckoutView } from '@/views/CheckoutView';
import { ContactView } from '@/views/ContactView';
import { DishView } from '@/views/DishView';
import { LegalView } from '@/views/LegalView';
import { MenuView } from '@/views/MenuView';
import { OffersView } from '@/views/OffersView';
import { OrderStatusView } from '@/views/OrderStatusView';
import { PromoAdminView } from '@/views/PromoAdminView';
import { ReservationView } from '@/views/ReservationView';
import { ReserveView } from '@/views/ReserveView';
import { RestaurantView } from '@/views/RestaurantView';
import { AdminView } from '@/views/admin/AdminView';

/**
 * Every page below the home page.
 *
 * One dispatcher instead of twenty near-identical route folders, because the
 * slugs differ per language: /de/speisekarte and /en/menu are the same page.
 * The first segment is matched against this locale's own slug table, so a
 * German slug requested under /en is a 404 rather than a quiet duplicate — the
 * same URL never exists twice.
 */

type Props = {
  params: Promise<{ locale: string; segments: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, segments } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);

  const titles: Partial<Record<RouteKey, string>> = {
    experience: dict.dock.experience,
    offers: dict.promo.title,
    assistant: dict.nav.assistant,
    menu: dict.menu.title,
    dish: dict.menu.title,
    order: dict.order.title,
    cart: dict.cart.title,
    checkout: dict.checkout.title,
    orderStatus: dict.orderStatus.title,
    reserve: dict.reserve.title,
    reservation: dict.reservation.title,
    restaurant: dict.space.title,
    contact: dict.contact.title,
    imprint: dict.footer.imprint,
    privacy: dict.footer.privacy,
    orderTerms: dict.footer.terms,
    promoAdmin: dict.promo.manage,
    admin: 'Admin',
  };

  const key = matchRoute(locale, segments[0] ?? '', segments.length > 1);
  const title = key ? titles[key] : undefined;

  return {
    title,
    // Nothing behind a personal link belongs in a search index.
    robots:
      key === 'reservation' || key === 'orderStatus' || key === 'checkout' ||
      key === 'promoAdmin' || segments[0] === routes.admin[locale]
        ? { index: false, follow: false }
        : undefined,
  };
}

export default async function SectionPage({ params, searchParams }: Props) {
  const { locale, segments } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const query = await searchParams;
  const [head, second, ...rest] = segments;

  /*
   * The back office is the one branch with pages of its own below it, so it is
   * matched before the flat slug table and handed the remaining segments. It is
   * never indexed and never linked from the site.
   */
  if (head === routes.admin[locale]) {
    return <AdminView locale={locale} dict={dict} segments={segments.slice(1)} query={query} />;
  }

  if (rest.length) notFound();

  const key = matchRoute(locale, head, Boolean(second));
  if (!key) notFound();

  /*
   * The screens still written in the older markup get their sheet of glass
   * here rather than each growing one of its own. Angebote and the guide are
   * deliberately not on this list: the drawings build those from separate
   * cards, and a frame around a frame is what made them read as billboards.
   */
  const sheet = (node: React.ReactNode) => <div className="glass screen-sheet legacy-sheet">
      <EdgeLight />
      {node}
    </div>;

  switch (key) {
    case 'experience':
      return <ExperienceView locale={locale} dict={dict} />;
    case 'menu':
      return <MenuView locale={locale} dict={dict} />;
    case 'offers':
      return <OffersView locale={locale} dict={dict} />;
    case 'assistant':
      return <AssistantView locale={locale} dict={dict} />;
    case 'dish':
      return sheet(<DishView locale={locale} dict={dict} slug={decodeURIComponent(second)} />);
    /*
     * Bestellen opens on the basket, as drawing 3 has it, and /warenkorb is the
     * same screen under its own name. The board owns its frame and its width,
     * so neither goes through the legacy sheet.
     */
    case 'order':
    case 'cart':
      return <CartView locale={locale} dict={dict} />;
    case 'checkout':
      return sheet(<CheckoutView locale={locale} dict={dict} query={query} />);
    case 'orderStatus':
      return sheet(<OrderStatusView locale={locale} dict={dict} token={decodeURIComponent(second)} />);
    case 'reserve':
      return <ReserveView locale={locale} dict={dict} query={query} />;
    case 'reservation':
      return sheet(<ReservationView locale={locale} dict={dict} token={decodeURIComponent(second)} />);
    case 'restaurant':
      return sheet(<RestaurantView locale={locale} dict={dict} />);
    case 'contact':
      return <ContactView locale={locale} dict={dict} />;
    case 'imprint':
    case 'privacy':
    case 'orderTerms':
      return sheet(<LegalView locale={locale} dict={dict} kind={key} />);
    case 'promoAdmin':
      return sheet(<PromoAdminView locale={locale} dict={dict} />);
    default:
      notFound();
  }
}

export const dynamic = 'force-dynamic';
