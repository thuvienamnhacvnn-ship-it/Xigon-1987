import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { settings } from '@/db/schema';
import { RESTAURANT } from '@/lib/restaurant';

/**
 * Runtime switches.
 *
 * The constants in `lib/restaurant` are the seed; this row is what the
 * restaurant can change without a deploy. Nothing that takes money is on by
 * default — pickup, delivery and payment stay off until someone deliberately
 * turns them on.
 */
export type Flags = {
  reservationsEnabled: boolean;
  reservationAutoConfirm: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  demoMode: boolean;
};

const DEFAULTS: Flags = {
  reservationsEnabled: RESTAURANT.reservationsEnabled,
  reservationAutoConfirm: RESTAURANT.reservationAutoConfirm,
  pickupEnabled: RESTAURANT.pickupEnabled,
  deliveryEnabled: RESTAURANT.deliveryEnabled,
  demoMode: RESTAURANT.demoMode,
};

const KEY = 'flags';

export async function getFlags(): Promise<Flags> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
    if (!row) return DEFAULTS;
    return { ...DEFAULTS, ...(row.value as Partial<Flags>) };
  } catch {
    // A page must still render if the database is not up yet — it just renders
    // with everything switched off, which is the safe direction to fail.
    return { ...DEFAULTS, reservationsEnabled: false, pickupEnabled: false, deliveryEnabled: false };
  }
}

export async function setFlags(patch: Partial<Flags>): Promise<Flags> {
  const next = { ...(await getFlags()), ...patch };
  await db
    .insert(settings)
    .values({ key: KEY, value: next })
    .onConflictDoUpdate({ target: settings.key, set: { value: next, updatedAt: new Date() } });
  return next;
}

/** True when ordering is possible at all, in either direction. */
export function orderingPossible(flags: Flags): boolean {
  return flags.pickupEnabled || flags.deliveryEnabled;
}
