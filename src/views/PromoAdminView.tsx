import { redirect } from 'next/navigation';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * The old standalone offers screen, now only a signpost.
 *
 * Managing offers moved into the back office, behind the same session as the
 * reservations. This URL stays alive because it is what anyone who bookmarked
 * it will type, but it no longer writes anything: it had a gate of its own —
 * a password field on every row, or nothing at all when the request came from
 * localhost — and two gates onto the same table is one too many.
 */
export function PromoAdminView({ locale }: { locale: Locale; dict: Dictionary }): never {
  return redirect(`${hrefFor(locale, 'admin')}/aktionen`);
}
