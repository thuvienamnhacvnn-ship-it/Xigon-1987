import Link from 'next/link';
import { PageHead } from './PageHead';
import viewStyles from './Views.module.css';
import { CheckoutForm } from '@/components/CheckoutForm';
import { readCart } from '@/server/cart';
import { slotsFor } from '@/server/orders';
import { getFlags, orderingPossible } from '@/server/settings';
import { isoDateInBerlin } from '@/lib/dates';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

export async function CheckoutView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [cart, flags] = await Promise.all([readCart(locale), getFlags()]);

  if (!orderingPossible(flags)) {
    return (
      <>
        <PageHead label={dict.nav.order} title={dict.checkout.title} />
        <div className={`section ${viewStyles.plain}`}>
          <div className="shell">
            <p className={viewStyles.empty}>{dict.order.closed}</p>
          </div>
        </div>
      </>
    );
  }

  if (!cart.lines.length) {
    return (
      <>
        <PageHead label={dict.nav.order} title={dict.checkout.title} />
        <div className={`section ${viewStyles.plain}`}>
          <div className="shell">
            <p className={viewStyles.empty}>{dict.cart.empty}</p>
            <p style={{ marginTop: '1.5rem' }}>
              <Link href={hrefFor(locale, 'menu')} className="btn btn--gold">
                {dict.cart.emptyCta}
              </Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  const today = isoDateInBerlin();
  const slots = await slotsFor(today);

  return (
    <>
      <PageHead
        label={dict.nav.order}
        title={dict.checkout.title}
        back={{ href: hrefFor(locale, 'cart'), label: dict.cart.title }}
      />

      <div className={`section ${viewStyles.plain}`}>
        <div className="shell">
          <CheckoutForm
            locale={locale}
            dict={dict}
            cart={cart}
            today={today}
            initialSlots={slots}
            pickupEnabled={flags.pickupEnabled}
            deliveryEnabled={flags.deliveryEnabled}
            demoMode={flags.demoMode}
          />
        </div>
      </div>
    </>
  );
}
