import { OfferBoard } from '@/components/app/OfferBoard';
import { getLivePromotions } from '@/server/content';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';

/**
 * Angebote.
 *
 * Only offers that are published and inside their own dates reach this screen —
 * an offer that ended yesterday is worse than no offer at all — so an empty
 * screen here is the correct answer, not a failure.
 */
export async function OffersView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const offers = await getLivePromotions(locale);

  if (!offers.length) {
    return <p className="screen-empty">{dict.promo.none}</p>;
  }

  return <OfferBoard locale={locale} dict={dict} offers={offers} />;
}
