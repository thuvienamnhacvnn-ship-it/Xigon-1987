import { AssistantBoard } from '@/components/app/AssistantBoard';
import { getMenu } from '@/server/menu';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';

/**
 * KI-Berater.
 *
 * The one rule this screen exists under: the guide answers only from the
 * published card. It never invents a dish, never invents a price and never
 * makes a statement about allergens — the restaurant has supplied no allergen
 * data, so there is nothing for it to repeat. Anything it cannot find on the
 * card, it hands to the team instead.
 */
export async function AssistantView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  /*
   * One real plate to look at while the guest decides what to ask. It comes off
   * the published card like everything else on this screen — a photograph of a
   * dish that does not exist would be the one thing this guide must never do —
   * and it is labelled as an example, not as an answer.
   */
  const categories = await getMenu(locale);
  const sample =
    categories
      .flatMap((entry) => entry.dishes)
      .filter((dish) => dish.photoId && !dish.soldOut && dish.variants.length)
      .find((dish) => dish.featured) ??
    categories
      .flatMap((entry) => entry.dishes)
      .find((dish) => dish.photoId && !dish.soldOut && dish.variants.length) ??
    null;

  const variant = sample?.variants.find((entry) => entry.isDefault) ?? sample?.variants[0];

  return (
    <AssistantBoard
      locale={locale}
      dict={dict}
      sample={
        sample && variant
          ? {
              dishId: String(sample.id),
              variantId: String(variant.id),
              slug: sample.slug,
              code: sample.code,
              name: sample.name,
              variantLabel: variant.label,
              priceCents: variant.priceCents,
              photoId: sample.photoId,
              soldOut: sample.soldOut,
              orderable: variant.orderable && !sample.soldOut,
            }
          : null
      }
    />
  );
}
