import { SceneStage } from '@/components/app/SceneStage';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';

/**
 * Erleben — the restaurant, moving.
 *
 * The screen is the video: no frame around it, no embed box, no player chrome
 * borrowed from somewhere else. Everything else sits on top of it.
 */
export function ExperienceView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return <SceneStage locale={locale} dict={dict} />;
}
