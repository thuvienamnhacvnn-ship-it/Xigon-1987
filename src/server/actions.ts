'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { addToCart, openCart, readCart, setLineQuantity } from './cart';
import { availability, cancelReservation, confirmReservation, holdSlot } from './reservations';
import { placeOrder, quoteCart, slotsFor } from './orders';
import { getFlags } from './settings';
import { hrefFor, locales, type Locale } from '@/lib/i18n';

/**
 * Server actions.
 *
 * Everything that changes state goes through this file, and every input is
 * parsed before it is used. The client sends ids and quantities; prices,
 * availability and totals are decided here.
 */

const localeSchema = z.enum(locales);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/* -------------------------------------------------------------------- cart */

const addSchema = z.object({
  locale: localeSchema,
  dishId: z.coerce.number().int().positive(),
  variantId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  note: z.string().max(240).optional().nullable(),
});

export type AddState =
  | { status: 'idle' }
  | { status: 'added'; itemCount: number }
  | { status: 'error'; reason: 'not_found' | 'sold_out' | 'not_orderable' | 'invalid' };

export async function addToCartAction(_previous: AddState, formData: FormData): Promise<AddState> {
  const parsed = addSchema.safeParse({
    locale: formData.get('locale'),
    dishId: formData.get('dishId'),
    variantId: formData.get('variantId'),
    quantity: formData.get('quantity') ?? 1,
    note: formData.get('note'),
  });
  if (!parsed.success) return { status: 'error', reason: 'invalid' };

  const result = await addToCart(parsed.data);
  if (!result.ok) return { status: 'error', reason: result.reason };

  revalidatePath(hrefFor(parsed.data.locale, 'cart'));
  return { status: 'added', itemCount: result.itemCount };
}

export async function setQuantityAction(formData: FormData): Promise<void> {
  const lineId = Number(formData.get('lineId'));
  const quantity = Number(formData.get('quantity'));
  if (!Number.isFinite(lineId) || !Number.isFinite(quantity)) return;

  await setLineQuantity(lineId, quantity);
  const locale = localeSchema.safeParse(formData.get('locale'));
  if (locale.success) revalidatePath(hrefFor(locale.data, 'cart'));
}

/* ------------------------------------------------------------ reservations */

const availabilitySchema = z.object({
  date: dateSchema,
  partySize: z.coerce.number().int().min(1).max(30),
});

export async function availabilityAction(input: { date: string; partySize: number }) {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return { kind: 'closed' as const };

  const flags = await getFlags();
  if (!flags.reservationsEnabled) return { kind: 'closed' as const };

  return availability(parsed.data.date, parsed.data.partySize);
}

export async function holdSlotAction(input: { date: string; minute: number; partySize: number }) {
  const parsed = z
    .object({
      date: dateSchema,
      minute: z.coerce.number().int().min(0).max(1800),
      partySize: z.coerce.number().int().min(1).max(30),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, reason: 'closed' as const };

  const flags = await getFlags();
  if (!flags.reservationsEnabled) return { ok: false as const, reason: 'closed' as const };

  const result = await holdSlot(parsed.data.date, parsed.data.minute, parsed.data.partySize);
  return result.ok ? { ...result, expiresAt: result.expiresAt.toISOString() } : result;
}

const guestSchema = z.object({
  holdToken: z.string().min(10).max(80),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(5).max(40),
  occasion: z.string().trim().max(120).optional().nullable(),
  seatingPreference: z.enum(['dining', 'bar']).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  locale: localeSchema,
});

/**
 * Only failures come back.
 *
 * On success the action redirects, so the browser is moved by the server rather
 * than by the caller: a `router.push` issued from inside the transition that is
 * still waiting on this action never runs.
 */
export type ReserveResult = { ok: false; reason: 'invalid' | 'hold_expired' | 'taken' | 'disabled'; field?: string };

export async function confirmReservationAction(input: unknown): Promise<ReserveResult | never> {
  const parsed = guestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid', field: parsed.error.issues[0]?.path.join('.') };
  }

  const flags = await getFlags();
  if (!flags.reservationsEnabled) return { ok: false, reason: 'disabled' };

  const result = await confirmReservation({ ...parsed.data, autoConfirm: flags.reservationAutoConfirm });
  if (!result.ok) return { ok: false, reason: result.reason };

  // Outside any try/catch: redirect works by throwing.
  redirect(hrefFor(parsed.data.locale, 'reservation', { token: result.token }));
}

export async function cancelReservationAction(token: string, locale: Locale) {
  const result = await cancelReservation(token);
  if (result.ok) revalidatePath(hrefFor(locale, 'reservation', { token }));
  return result;
}

/* ------------------------------------------------------------------ order */

export async function slotsAction(date: string) {
  const parsed = dateSchema.safeParse(date);
  if (!parsed.success) return [];
  return slotsFor(parsed.data);
}

const checkoutSchema = z.object({
  locale: localeSchema,
  fulfilment: z.enum(['pickup', 'delivery']),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(5).max(40),
  street: z.string().trim().max(160).optional().nullable(),
  postalCode: z.string().trim().max(10).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  addressNote: z.string().trim().max(300).optional().nullable(),
  slotDate: dateSchema,
  slotMinute: z.coerce.number().int().min(0).max(1800),
  idempotencyKey: z.string().min(8).max(64),
});

/** Only failures come back; success redirects to the order's own page. */
export type CheckoutResult =
  | {
      ok: false;
      reason: 'invalid' | 'empty' | 'slot_full' | 'below_minimum' | 'unavailable' | 'disabled' | 'no_cart';
      field?: string;
    };

export async function placeOrderAction(input: unknown): Promise<CheckoutResult | never> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid', field: parsed.error.issues[0]?.path.join('.') };
  }

  // A delivery order without an address is not an order.
  if (parsed.data.fulfilment === 'delivery' && !parsed.data.street) {
    return { ok: false, reason: 'invalid', field: 'street' };
  }

  const flags = await getFlags();
  const cart = await openCart();
  const quote = await quoteCart(cart.id, parsed.data.locale, parsed.data.fulfilment);
  if (!quote.lines.length) return { ok: false, reason: 'empty' };

  const result = await placeOrder({ ...parsed.data, cartId: cart.id }, flags);
  if (!result.ok) return { ok: false, reason: result.reason };

  revalidatePath(hrefFor(parsed.data.locale, 'cart'));
  redirect(hrefFor(parsed.data.locale, 'orderStatus', { token: result.token }));
}

/** Used by the checkout page to re-price without placing anything. */
export async function quoteAction(locale: Locale, fulfilment: 'pickup' | 'delivery') {
  const cart = await openCart();
  return quoteCart(cart.id, locale, fulfilment);
}

export async function readCartAction(locale: Locale) {
  return readCart(locale);
}
