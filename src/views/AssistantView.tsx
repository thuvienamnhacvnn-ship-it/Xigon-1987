import { AssistantBoard } from '@/components/app/AssistantBoard';
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
export function AssistantView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return <AssistantBoard locale={locale} dict={dict} />;
}
