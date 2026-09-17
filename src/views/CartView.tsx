import { CartBoard } from '@/components/app/CartBoard';
import { readCart } from '@/server/cart';
import { slotsFor } from '@/server/orders';
import { getFlags, orderingPossible } from '@/server/settings';
import { isoDateInBerlin } from '@/lib/dates';
import { PRICE_NOTE } from '@/lib/price-note';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';

/**
 * The basket — and, since drawing 3 puts it there, the Bestellen tab itself.
 *
 * Both slugs land here on purpose. Bestellen used to open on two picture cards
 * explaining that takeaway exists, which is a page a guest reads once; the
 * drawing opens the tab on the basket, with the way of collecting and the hour
 * beside it, so that is what both routes render.
 *
 * Everything the screen shows is read here: the basket the server has already
 * priced, and the hours the kitchen can still promise today. The board sends
 * back ids and quantities — never a price.
 */
export async function CartView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [cart, flags] = await Promise.all([readCart(locale), getFlags()]);
  const today = isoDateInBerlin();

  /* Slots are only worth fetching when there is something to collect. */
  const slots = cart.lines.length ? await slotsFor(today) : [];

  return (
    <CartBoard
      locale={locale}
      dict={dict}
      cart={cart}
      slots={slots}
      pickupEnabled={flags.pickupEnabled}
      deliveryEnabled={flags.deliveryEnabled}
      canOrder={orderingPossible(flags)}
      demoMode={flags.demoMode}
      priceNote={PRICE_NOTE[locale]}
    />
  );
}
