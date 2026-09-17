import 'server-only';

import { randomBytes, randomInt } from 'node:crypto';
import { and, asc, eq, inArray, lt } from 'drizzle-orm';
import { db } from '@/db/client';
import { cartItems, carts, dishVariants, dishes, orderItems, orders, type OrderStatus } from '@/db/schema';
import { OPERATING_HOURS, RESTAURANT } from '@/lib/restaurant';
import { isoDateInBerlin } from '@/lib/dates';
import { taxIncludedCents } from '@/lib/money';
import { tr, type Locale } from '@/lib/i18n';
import { clearCart } from './cart';
import type { Flags } from './settings';

/**
 * Takeaway.
 *
 * The rule this file exists to enforce: the guest never sets a price. A basket
 * arrives as a list of ids and quantities; everything a guest is charged is
 * read back out of the menu here, at the moment of ordering.
 */

export type Slot = { minute: number; label: string; full: boolean };

function label(minute: number) {
  const hour = Math.floor(minute / 60) % 24;
  return `${String(hour).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

function berlinMinuteNow(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: RESTAURANT.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  return (
    Number(parts.find((part) => part.type === 'hour')?.value ?? 0) * 60 +
    Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  );
}

/*
 * `awaiting_payment` counts against a slot like any other order.
 *
 * With no provider connected it is where every order that chose PayPal, a card
 * or a wallet comes to rest — a real order the kitchen has been asked to cook.
 * Left out of this list the same six o'clock would be sold as often as it was
 * asked for.
 */
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'awaiting_payment',
  'placed',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
];

/**
 * Releases slots held by orders that were never paid for.
 *
 * The counterpart of `expireHolds()` on the reservations side, and needed for
 * the same reason: something has to be able to say no eventually. An order that
 * chose PayPal and then went nowhere sits in `awaiting_payment` and counts
 * against a slot exactly like a real one, so without this the fourth abandoned
 * basket closes that quarter of an hour for good — and with no provider
 * connected, every one of them is abandoned.
 *
 * It cancels rather than deletes. The row is what the restaurant looks at when
 * a guest rings up about an order they thought they had placed, and a row that
 * quietly vanished cannot answer that question.
 */
export async function expireUnpaidOrders(): Promise<void> {
  const deadline = new Date(Date.now() - RESTAURANT.orderPaymentWindowMinutes * 60_000);
  await db
    .update(orders)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(orders.status, 'awaiting_payment'), lt(orders.createdAt, deadline)));
}

/**
 * The times the kitchen can still promise today.
 *
 * Capacity is per slot, not per day: a kitchen that accepts forty orders for
 * 19:00 has accepted forty disappointments.
 */
export async function slotsFor(date: string): Promise<Slot[]> {
  const opens = OPERATING_HOURS.kitchen.opensMinute;
  const closes = OPERATING_HOURS.kitchen.closesMinute;
  const step = RESTAURANT.orderSlotMinutes;

  const isToday = date === isoDateInBerlin();
  const earliest = isToday ? berlinMinuteNow() + RESTAURANT.orderLeadTimeMinutes : opens;

  // Before counting what is taken, let go of what was never paid for.
  await expireUnpaidOrders();

  const taken = await db
    .select({ slotMinute: orders.slotMinute })
    .from(orders)
    .where(and(eq(orders.slotDate, date), inArray(orders.status, ACTIVE_ORDER_STATUSES)));

  const load = new Map<number, number>();
  for (const row of taken) load.set(row.slotMinute, (load.get(row.slotMinute) ?? 0) + 1);

  const slots: Slot[] = [];
  for (let minute = Math.max(opens, Math.ceil(earliest / step) * step); minute <= closes; minute += step) {
    slots.push({
      minute,
      label: label(minute),
      full: (load.get(minute) ?? 0) >= RESTAURANT.orderSlotCapacity,
    });
  }
  return slots;
}

export type QuoteLine = {
  dishId: number;
  variantId: number;
  name: string;
  variantLabel: string;
  quantity: number;
  note: string | null;
  unitPriceCents: number;
  totalCents: number;
};

export type Quote = {
  lines: QuoteLine[];
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  problems: { kind: 'sold_out' | 'not_orderable'; name: string }[];
  belowMinimum: boolean;
  minimumCents: number;
};

/**
 * Prices a cart for a given fulfilment, from the live menu.
 *
 * Called to render the checkout *and* again inside `placeOrder`, so what the
 * guest saw and what they are charged are produced by the same code.
 */
export async function quoteCart(cartId: number, locale: Locale, fulfilment: 'pickup' | 'delivery'): Promise<Quote> {
  const rows = await db
    .select({ item: cartItems, dish: dishes, variant: dishVariants })
    .from(cartItems)
    .innerJoin(dishes, eq(cartItems.dishId, dishes.id))
    .innerJoin(dishVariants, eq(cartItems.variantId, dishVariants.id))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.id));

  const lines: QuoteLine[] = [];
  const problems: Quote['problems'] = [];

  for (const { item, dish, variant } of rows) {
    const name = tr(locale, { de: dish.nameDe, en: dish.nameEn, vi: dish.nameVi });
    if (dish.soldOut) {
      problems.push({ kind: 'sold_out', name });
      continue;
    }
    if (!variant.orderable || !dish.published) {
      problems.push({ kind: 'not_orderable', name });
      continue;
    }
    lines.push({
      dishId: dish.id,
      variantId: variant.id,
      name,
      variantLabel: tr(locale, { de: variant.labelDe, en: variant.labelEn, vi: variant.labelVi }),
      quantity: item.quantity,
      note: item.note,
      unitPriceCents: variant.priceCents,
      totalCents: variant.priceCents * item.quantity,
    });
  }

  const subtotalCents = lines.reduce((total, line) => total + line.totalCents, 0);
  // Delivery pricing has not been confirmed by the restaurant, so no fee is
  // invented. When they set one it belongs in settings, not in this constant.
  const deliveryFeeCents = 0;
  const totalCents = subtotalCents + deliveryFeeCents;
  const minimumCents = fulfilment === 'delivery' ? RESTAURANT.deliveryMinimumCents : 0;

  return {
    lines,
    subtotalCents,
    deliveryFeeCents,
    taxCents: taxIncludedCents(totalCents, RESTAURANT.taxRateBasisPoints),
    totalCents,
    problems,
    belowMinimum: subtotalCents < minimumCents,
    minimumCents,
  };
}

/**
 * What the guest said they would like to pay with.
 *
 * A choice, not a charge. No provider is connected, so none of these moves any
 * money; `placeOrder` records which one was picked and nothing else.
 */
export type PaymentMethod = 'paypal' | 'card' | 'wallet' | 'on_collection';

export type PlaceInput = {
  cartId: number;
  locale: Locale;
  fulfilment: 'pickup' | 'delivery';
  paymentMethod: PaymentMethod;
  name: string;
  email: string;
  phone: string;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  addressNote?: string | null;
  slotDate: string;
  slotMinute: number;
  idempotencyKey: string;
};

export type PlaceResult =
  | { ok: true; token: string; reference: string; totalCents: number; replay: boolean }
  | { ok: false; reason: 'empty' | 'slot_full' | 'below_minimum' | 'unavailable' | 'disabled' };

function reference() {
  const alphabet = 'ACDEFGHJKLMNPQRTUVWXY3479';
  let out = '';
  for (let i = 0; i < 6; i += 1) out += alphabet[randomInt(alphabet.length)];
  return `B-${out}`;
}

export async function placeOrder(input: PlaceInput, flags: Flags): Promise<PlaceResult> {
  if (input.fulfilment === 'pickup' && !flags.pickupEnabled) return { ok: false, reason: 'disabled' };
  if (input.fulfilment === 'delivery' && !flags.deliveryEnabled) return { ok: false, reason: 'disabled' };

  // A retried submit must return the first order, not create a second one.
  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing) {
    return { ok: true, token: existing.token, reference: existing.reference, totalCents: existing.totalCents, replay: true };
  }

  const quote = await quoteCart(input.cartId, input.locale, input.fulfilment);
  if (!quote.lines.length) return { ok: false, reason: 'empty' };
  if (quote.problems.length) return { ok: false, reason: 'unavailable' };
  if (quote.belowMinimum) return { ok: false, reason: 'below_minimum' };

  const slots = await slotsFor(input.slotDate);
  const slot = slots.find((entry) => entry.minute === input.slotMinute);
  if (!slot || slot.full) return { ok: false, reason: 'slot_full' };

  const token = randomBytes(24).toString('base64url');

  /*
   * Nothing here takes money, because there is nothing to take it with.
   *
   * Paying on collection is settled at the counter, so that order is complete
   * the moment it is written — `placed`. The other three are not: the guest
   * asked to pay through a provider, and until one is connected the truthful
   * record is an order still waiting for a payment that has not happened. The
   * method is kept so the restaurant can see what was asked for, and `paidAt`
   * stays null because nobody has paid.
   */
  const onCollection = input.paymentMethod === 'on_collection';

  /*
   * The basket's note, read here rather than inside the transaction — a query
   * on the outer handle while a PGlite transaction is open deadlocks silently.
   */
  const [basket] = await db
    .select({ note: carts.note })
    .from(carts)
    .where(eq(carts.id, input.cartId))
    .limit(1);

  const created = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        token,
        reference: reference(),
        status: onCollection ? 'placed' : 'awaiting_payment',
        paymentProvider: onCollection ? null : input.paymentMethod,
        fulfilment: input.fulfilment,
        name: input.name.trim().slice(0, 120),
        email: input.email.trim().slice(0, 160),
        phone: input.phone.trim().slice(0, 40),
        street: input.street?.trim().slice(0, 160) || null,
        postalCode: input.postalCode?.trim().slice(0, 10) || null,
        city: input.city?.trim().slice(0, 80) || null,
        addressNote: input.addressNote?.trim().slice(0, 300) || null,
        guestNote: basket?.note ?? null,
        locale: input.locale,
        slotDate: input.slotDate,
        slotMinute: input.slotMinute,
        subtotalCents: quote.subtotalCents,
        deliveryFeeCents: quote.deliveryFeeCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        idempotencyKey: input.idempotencyKey,
      })
      .returning();

    await tx.insert(orderItems).values(
      quote.lines.map((line) => ({
        orderId: order.id,
        dishId: line.dishId,
        variantId: line.variantId,
        nameSnapshot: line.name,
        variantSnapshot: line.variantLabel,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        totalCents: line.totalCents,
        note: line.note,
      })),
    );

    return order;
  });

  await clearCart(input.cartId);
  return { ok: true, token: created.token, reference: created.reference, totalCents: created.totalCents, replay: false };
}

export async function getOrderByToken(token: string) {
  const [order] = await db.select().from(orders).where(eq(orders.token, token)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.id));
  return { order, items };
}
