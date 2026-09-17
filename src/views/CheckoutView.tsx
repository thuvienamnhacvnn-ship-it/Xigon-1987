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
export async function CheckoutView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
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

  return (
    <CheckoutBoard
      locale={locale}
      dict={dict}
      cart={cart}
      today={today}
      initialSlots={slots}
      pickupEnabled={flags.pickupEnabled}
      deliveryEnabled={flags.deliveryEnabled}
      demoMode={flags.demoMode}
      priceNote={PRICE_NOTE[locale]}
    />
  );
}
