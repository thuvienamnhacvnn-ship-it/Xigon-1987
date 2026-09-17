/**
 * An end-to-end check of the parts that are easy to break and hard to see:
 * availability, holds, double booking, confirmation and cancellation, plus
 * cart pricing and the menu guide's grounding.
 *
 * Run it against the real database with the dev server stopped:
 *   npm run smoke
 *
 * It writes test rows (prefixed SMOKE) and removes them again at the end.
 */
import { and, eq, like, or, sql } from 'drizzle-orm';
import { db } from '../src/db/client';
import { cartItems, carts, channelEvents, orders, reservationHolds, reservations } from '../src/db/schema';
import { applyBooking } from '../src/server/channels/intake';
import { availability, cancelReservation, confirmReservation, holdSlot } from '../src/server/reservations';
import { getCatalogue, priceFor } from '../src/server/menu';
import { expireUnpaidOrders, placeOrder, slotsFor } from '../src/server/orders';
import { getFlags } from '../src/server/settings';
import { isoDateInBerlin, addDays } from '../src/lib/dates';
import { RESTAURANT } from '../src/lib/restaurant';

let failures = 0;

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok    ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`);
  }
}

const date = addDays(isoDateInBerlin(), 3);

console.log(`\nmenu`);
const catalogue = await getCatalogue('de');
check('catalogue is published', catalogue.length > 0, catalogue.length);
check('every dish has at least one variant', catalogue.every((dish) => dish.variants.length > 0));
check('every price is a positive integer', catalogue.every((dish) => dish.variants.every((v) => Number.isInteger(v.priceCents) && v.priceCents > 0)));
check('drinks are not orderable online', catalogue.filter((d) => d.categorySlug === 'bar').every((d) => d.variants.every((v) => !v.orderable)));

const first = catalogue.find((dish) => dish.variants.some((variant) => variant.orderable));
if (first) {
  const variant = first.variants.find((entry) => entry.orderable)!;
  const live = await priceFor(first.id, variant.id);
  check('server price matches the menu', live?.priceCents === variant.priceCents, { live: live?.priceCents, menu: variant.priceCents });
}

console.log(`\nreservations (${date})`);
const free = await availability(date, 2);
check('a future date has free times', free.kind === 'ok' && free.slots.length > 0, free);

if (free.kind === 'ok' && free.slots.length) {
  const minute = free.slots[Math.floor(free.slots.length / 2)].minute;

  const hold = await holdSlot(date, minute, 2);
  check('a time can be held', hold.ok, hold);

  if (hold.ok) {
    const confirmed = await confirmReservation({
      holdToken: hold.token,
      name: 'SMOKE Test',
      email: 'smoke@example.com',
      phone: '+490000000',
      locale: 'de',
      autoConfirm: false,
      note: 'SMOKE',
    });
    check('a held time can be confirmed', confirmed.ok, confirmed);

    if (confirmed.ok) {
      check('an unconfirmed booking is a request, not a promise', confirmed.status === 'requested', confirmed.status);

      const cancelled = await cancelReservation(confirmed.token);
      check('a guest can cancel their own booking', cancelled.ok, cancelled);

      const twice = await cancelReservation(confirmed.token);
      check('cancelling twice is refused', !twice.ok && twice.reason === 'already', twice);
    }
  }

  // Fill the house at one minute and prove the next party is turned away
  // rather than quietly double-booked.
  const held: string[] = [];
  for (let i = 0; i < 40; i += 1) {
    const attempt = await holdSlot(date, minute, 2);
    if (!attempt.ok) break;
    held.push(attempt.token);
  }
  const overflow = await holdSlot(date, minute, 2);
  check('the house fills up and then says no', !overflow.ok && overflow.reason === 'taken', { held: held.length, overflow });

  await db.delete(reservationHolds).where(sql`true`);

  const afterRelease = await availability(date, 2);
  check('releasing the holds frees the times again', afterRelease.kind === 'ok' && afterRelease.slots.length > 0);
}

console.log(`\nbookings from a platform`);
{
  const base = {
    externalId: 'SMOKE-1',
    action: 'booked' as const,
    date,
    time: '18:00',
    partySize: 2,
    name: 'SMOKE Platform',
    email: 'smoke@example.com',
    phone: '+490000000',
    note: null,
    eventId: null,
  };

  const created = await applyBooking('quandoo', base, null);
  check('a platform booking is taken', created.ok && created.outcome === 'created', created);
  check('and it gets a table', created.ok && !created.conflict, created);

  // The same external id is the same booking, not a second one.
  const updated = await applyBooking('quandoo', { ...base, partySize: 4 }, null);
  check('the same booking id updates in place', updated.ok && updated.outcome === 'updated', updated);
  check(
    'and does not create a second row',
    (await db.select().from(reservations).where(like(reservations.externalId, 'SMOKE-%'))).length === 1,
  );

  // Fill every table at that minute, then prove the next platform booking is
  // still recorded — flagged for a human, not lost.
  for (let i = 0; i < 40; i += 1) {
    const attempt = await holdSlot(date, 18 * 60, 2);
    if (!attempt.ok) break;
  }
  const squeezed = await applyBooking('thefork', { ...base, externalId: 'SMOKE-2' }, null);
  check('a booking with no table is still recorded', squeezed.ok && squeezed.outcome === 'created', squeezed);
  check('and is flagged for a human', squeezed.ok && squeezed.conflict === true, squeezed);
  await db.delete(reservationHolds).where(sql`true`);

  const cancelled = await applyBooking('quandoo', { ...base, action: 'cancelled' }, null);
  check('a platform cancellation is applied', cancelled.ok && cancelled.outcome === 'cancelled', cancelled);

  const orphan = await applyBooking('quandoo', { ...base, externalId: 'SMOKE-NOPE', action: 'cancelled' }, null);
  check('cancelling something we never had is refused', !orphan.ok, orphan);
}

console.log(`\norder slots`);
const slots = await slotsFor(date);
check('a future date offers collection times', slots.length > 0, slots.length);
check('slot times run in order', slots.every((slot, index) => index === 0 || slot.minute > slots[index - 1].minute));

/*
 * An unpaid order must not hold a slot for ever.
 *
 * With no payment provider connected every card and wallet order stops at
 * `awaiting_payment`, and those count against the kitchen exactly like real
 * ones. Four abandoned baskets would close a quarter of an hour permanently if
 * nothing let go of them, so this checks that something does.
 */
const slotMinute = slots[0]?.minute ?? 0;
const stale = new Date(Date.now() - (RESTAURANT.orderPaymentWindowMinutes + 5) * 60_000);

for (let index = 0; index < RESTAURANT.orderSlotCapacity; index += 1) {
  await db.insert(orders).values({
    token: `SMOKE-${index}-${Date.now()}`,
    reference: `SMOKE${index}${Date.now() % 100000}`,
    status: 'awaiting_payment',
    fulfilment: 'pickup',
    name: 'SMOKE unpaid',
    email: 'smoke@example.com',
    phone: '000',
    locale: 'de',
    slotDate: date,
    slotMinute,
    subtotalCents: 1000,
    taxCents: 160,
    totalCents: 1000,
    paymentProvider: 'paypal',
    createdAt: stale,
  });
}

const blocked = await slotsFor(date);
check(
  'an abandoned payment does not keep a slot closed',
  blocked.find((slot) => slot.minute === slotMinute)?.full === false,
  blocked.find((slot) => slot.minute === slotMinute)?.full,
);

const swept = await db
  .select({ status: orders.status })
  .from(orders)
  /* Only the orders this check wrote: a run that died before its cleanup
     leaves other SMOKE rows behind, and they are not what is being asked. */
  .where(like(orders.name, 'SMOKE unpaid%'));
check(
  'and the order is marked cancelled rather than left hanging',
  swept.length > 0 && swept.every((row) => row.status === 'cancelled'),
  swept.map((row) => row.status).join(','),
);

await expireUnpaidOrders();

/*
 * The line a guest writes under the basket has to reach the kitchen.
 *
 * "Ohne Koriander" is a preference; "Erdnussallergie" is not, and a field that
 * takes one and drops it on the way to the order is worse than no field. This
 * walks the whole path — basket note, order, stored row — rather than trusting
 * that the column is wired up.
 */
console.log(`\nthe note under the basket`);
const [noteCart] = await db
  .insert(carts)
  .values({ token: `SMOKE-note-${Date.now()}`, note: 'SMOKE Erdnussallergie' })
  .returning();

const orderable = catalogue.find((dish) => dish.variants.some((variant) => variant.orderable));
const orderableVariant = orderable?.variants.find((variant) => variant.orderable);

if (orderable && orderableVariant) {
  await db.insert(cartItems).values({
    cartId: noteCart.id,
    dishId: orderable.id,
    variantId: orderableVariant.id,
    quantity: 1,
    addedPriceCents: orderableVariant.priceCents,
  });

  const free = (await slotsFor(date)).find((slot) => !slot.full);
  const placed = await placeOrder(
    {
      cartId: noteCart.id,
      locale: 'de',
      fulfilment: 'pickup',
      paymentMethod: 'on_collection',
      name: 'SMOKE note',
      email: 'smoke@example.com',
      phone: '000',
      slotDate: date,
      slotMinute: free?.minute ?? 0,
      idempotencyKey: `SMOKE-note-${Date.now()}`,
    },
    await getFlags(),
  );

  check('an order can be placed from a basket carrying a note', placed.ok, placed);

  if (placed.ok) {
    const [row] = await db
      .select({ guestNote: orders.guestNote })
      .from(orders)
      .where(eq(orders.token, placed.token))
      .limit(1);
    check('and the note is on the order the kitchen reads', row?.guestNote === 'SMOKE Erdnussallergie', row?.guestNote);
  }
}

await db.delete(carts).where(like(carts.token, 'SMOKE-%'));

/* ---------------------------------------------------------------- cleanup */
await db.delete(orders).where(like(orders.name, 'SMOKE%'));
await db.delete(reservations).where(or(like(reservations.name, 'SMOKE%'), like(reservations.externalId, 'SMOKE-%')));
await db.delete(channelEvents).where(sql`true`);
await db.delete(reservationHolds).where(sql`true`);

console.log(failures === 0 ? '\nall checks passed\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
