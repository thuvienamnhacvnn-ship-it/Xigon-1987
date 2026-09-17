import Link from 'next/link';
import { CheckoutBoard } from '@/components/app/CheckoutBoard';
import { readCart } from '@/server/cart';
import { slotsFor } from '@/server/orders';
import { getFlags, orderingPossible } from '@/server/settings';
import { isoDateInBerlin } from '@/lib/dates';
import { PRICE_NOTE } from '@/lib/price-note';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * Kasse.
 *
 * Everything the screen needs is fetched here and rendered with the page: the
 * basket the server has already priced, and the hours the kitchen can still
 * promise today. The board sends back ids and a payment method — never a price.
 */
export async function CheckoutView({
  locale,
  dict,
  query,
}: {
  locale: Locale;
  dict: Dictionary;
  query?: Record<string, string | string[] | undefined>;
}) {
  const [cart, flags] = await Promise.all([readCart(locale), getFlags()]);

  if (!orderingPossible(flags)) {
    return (
      <div className="screen-empty">
        <p>{dict.order.closed}</p>
      </div>
    );
  }

  if (!cart.lines.length) {
    return (
      <div className="screen-empty">
        <p>{dict.cart.empty}</p>
        <p>
          <Link href={hrefFor(locale, 'menu')} className="cta">
            {dict.cart.emptyCta}
          </Link>
        </p>
      </div>
    );
  }

  const today = isoDateInBerlin();
  const slots = await slotsFor(today);

  /*
   * The hour the guest chose on the basket screen, carried in the link. It is
   * only a preference: if that quarter-hour filled up while they were reading,
   * the board falls back to the first one still free rather than sending an
   * order the kitchen would have to refuse.
   */
  const wanted = Number(Array.isArray(query?.zeit) ? query?.zeit[0] : query?.zeit);
  const preferred = slots.some((slot) => slot.minute === wanted && !slot.full) ? wanted : null;

  return (
    <CheckoutBoard
      locale={locale}
      dict={dict}
      cart={cart}
      today={today}
      initialSlots={slots}
      preferredMinute={preferred}
      pickupEnabled={flags.pickupEnabled}
      deliveryEnabled={flags.deliveryEnabled}
      demoMode={flags.demoMode}
      priceNote={PRICE_NOTE[locale]}
    />
  );
}
