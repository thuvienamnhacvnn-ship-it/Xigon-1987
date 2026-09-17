import 'server-only';

import { randomBytes } from 'node:crypto';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { cartItems, carts, dishVariants, dishes } from '@/db/schema';
import { CART_COOKIE, CART_COUNT_COOKIE, CART_MAX_AGE_SECONDS } from '@/lib/cart-cookie';
import { taxIncludedCents } from '@/lib/money';
import { tr, type Locale } from '@/lib/i18n';
import { RESTAURANT } from '@/lib/restaurant';

/**
 * The cart.
 *
 * It lives in the database keyed by an opaque cookie token, not in the cookie
 * itself, for one reason: prices. A cart the client could edit is a cart the
 * client could price, and every total here is recomputed from the live menu
 * each time it is read.
 */

export type CartLine = {
  id: number;
  dishId: number;
  variantId: number;
  slug: string;
  name: string;
  variantLabel: string;
  /**
   * The line under the name on the basket screen: what the dish is, in the
   * kitchen's own words. The description where there is one, otherwise the
   * ingredients — a basket line with only a name reads as a receipt.
   */
  detail: string | null;
  quantity: number;
  note: string | null;
  unitPriceCents: number;
  totalCents: number;
  /*
   * The dish photograph, not the plate cut-out.
   *
   * The cut-outs were made for the old banner; the card, the guide and now the
   * basket all show the photograph. A basket line whose picture is missing
   * looks like a line that went wrong.
   */
  photoId: string | null;
  plateId: string | null;
  soldOut: boolean;
  orderable: boolean;
  /** True when the live price differs from the price at the time it was added. */
  priceChanged: boolean;
};

export type Cart = {
  token: string;
  /** What the guest wrote under the basket — allergies, "no coriander". */
  note: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  taxCents: number;
  /** Anything the guest has to be told before they can check out. */
  problems: { kind: 'sold_out' | 'not_orderable' | 'price_changed'; name: string }[];
};

const EMPTY: Cart = { token: '', note: null, lines: [], itemCount: 0, subtotalCents: 0, taxCents: 0, problems: [] };

function newToken() {
  return randomBytes(24).toString('base64url');
}

/** Reads the cart cookie without creating anything. */
export async function currentCartToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value ?? null;
}

/**
 * Finds or creates the cart for this browser.
 *
 * Only called from routes that write, because a Server Component may not set
 * cookies — reads use `readCart`, which never creates one.
 */
export async function openCart(): Promise<{ id: number; token: string }> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;

  if (existing) {
    const [row] = await db.select().from(carts).where(eq(carts.token, existing)).limit(1);
    if (row) return { id: row.id, token: row.token };
  }

  const token = newToken();
  const [row] = await db.insert(carts).values({ token }).returning();
  jar.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_MAX_AGE_SECONDS,
  });
  return { id: row.id, token };
}

/**
 * Keeps the header badge in step without a database read on every page.
 *
 * The badge is a mirror of the basket, never the basket itself, so it is not
 * worth failing a whole order over. Away from a request — a script, a sweep,
 * a test — there is no jar to write into and Next throws; the basket in the
 * database is still right, and the next page the guest opens sets the cookie.
 */
async function writeCountCookie(count: number) {
  try {
    /* `cookies()` throws where there is no request, and it throws on the way
       in rather than returning a rejected promise — so this has to be a
       try/catch, not a `.catch()`. */
    const jar = await cookies();
    jar.set(CART_COUNT_COOKIE, String(count), {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: CART_MAX_AGE_SECONDS,
    });
  } catch {
    /* No request to write into. The basket is still correct. */
  }
}

export async function readCart(locale: Locale, token?: string | null): Promise<Cart> {
  const cartToken = token ?? (await currentCartToken());
  if (!cartToken) return EMPTY;

  const [cart] = await db.select().from(carts).where(eq(carts.token, cartToken)).limit(1);
  if (!cart) return EMPTY;

  const rows = await db
    .select({ item: cartItems, dish: dishes, variant: dishVariants })
    .from(cartItems)
    .innerJoin(dishes, eq(cartItems.dishId, dishes.id))
    .innerJoin(dishVariants, eq(cartItems.variantId, dishVariants.id))
    .where(eq(cartItems.cartId, cart.id))
    .orderBy(asc(cartItems.id));

  /*
   * How many ways each of these dishes can be ordered.
   *
   * A dish with one variant has a label like "Portion", which says nothing a
   * guest did not already know — the basket printed it under every line and it
   * read as filler. Where there is a real choice ("klein"/"groß", "mit Ente")
   * the line has to show which one was picked.
   */
  const dishIds = [...new Set(rows.map((row) => row.dish.id))];
  const variantRows = dishIds.length
    ? await db
        .select({ dishId: dishVariants.dishId })
        .from(dishVariants)
        .where(inArray(dishVariants.dishId, dishIds))
    : [];
  const variantCount = new Map<number, number>();
  for (const row of variantRows) variantCount.set(row.dishId, (variantCount.get(row.dishId) ?? 0) + 1);

  const lines: CartLine[] = rows.map(({ item, dish, variant }) => {
    const unitPriceCents = variant.priceCents;
    return {
      id: item.id,
      dishId: dish.id,
      variantId: variant.id,
      slug: dish.slug,
      name: tr(locale, { de: dish.nameDe, en: dish.nameEn, vi: dish.nameVi }),
      variantLabel:
        (variantCount.get(dish.id) ?? 1) > 1
          ? tr(locale, { de: variant.labelDe, en: variant.labelEn, vi: variant.labelVi })
          : '',
      detail:
        tr(locale, { de: dish.descriptionDe, en: dish.descriptionEn, vi: dish.descriptionVi }) ||
        tr(locale, { de: dish.ingredientsDe, en: dish.ingredientsEn, vi: dish.ingredientsVi }) ||
        null,
      quantity: item.quantity,
      note: item.note,
      unitPriceCents,
      totalCents: unitPriceCents * item.quantity,
      photoId: dish.photoId,
      plateId: dish.plateId,
      soldOut: dish.soldOut,
      orderable: variant.orderable && dish.published,
      priceChanged: unitPriceCents !== item.addedPriceCents,
    };
  });

  const subtotalCents = lines.reduce((total, line) => total + line.totalCents, 0);
  const problems: Cart['problems'] = [];
  for (const line of lines) {
    if (line.soldOut) problems.push({ kind: 'sold_out', name: line.name });
    else if (!line.orderable) problems.push({ kind: 'not_orderable', name: line.name });
    if (line.priceChanged) problems.push({ kind: 'price_changed', name: line.name });
  }

  return {
    token: cart.token,
    note: cart.note,
    lines,
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    subtotalCents,
    taxCents: taxIncludedCents(subtotalCents, RESTAURANT.taxRateBasisPoints),
    problems,
  };
}

export async function addToCart(input: {
  dishId: number;
  variantId: number;
  quantity: number;
  note?: string | null;
}): Promise<{ ok: true; itemCount: number } | { ok: false; reason: 'not_found' | 'sold_out' | 'not_orderable' }> {
  const [row] = await db
    .select({ dish: dishes, variant: dishVariants })
    .from(dishVariants)
    .innerJoin(dishes, eq(dishVariants.dishId, dishes.id))
    .where(and(eq(dishVariants.id, input.variantId), eq(dishVariants.dishId, input.dishId)))
    .limit(1);

  if (!row || !row.dish.published) return { ok: false, reason: 'not_found' };
  if (row.dish.soldOut) return { ok: false, reason: 'sold_out' };
  if (!row.variant.orderable) return { ok: false, reason: 'not_orderable' };

  const cart = await openCart();
  const quantity = Math.min(Math.max(Math.trunc(input.quantity) || 1, 1), 20);
  const note = input.note?.trim().slice(0, 240) || null;

  // The same dish with the same note merges into one line; a different note is
  // a different instruction to the kitchen and stays its own line.
  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, input.variantId)))
    .limit(1);

  if (existing && (existing.note ?? null) === note) {
    await db
      .update(cartItems)
      .set({ quantity: Math.min(existing.quantity + quantity, 40) })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id,
      dishId: input.dishId,
      variantId: input.variantId,
      quantity,
      note,
      addedPriceCents: row.variant.priceCents,
    });
  }

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  const count = await countItems(cart.id);
  await writeCountCookie(count);
  return { ok: true, itemCount: count };
}

export async function setLineQuantity(lineId: number, quantity: number): Promise<number> {
  const token = await currentCartToken();
  if (!token) return 0;
  const [cart] = await db.select().from(carts).where(eq(carts.token, token)).limit(1);
  if (!cart) return 0;

  const next = Math.min(Math.max(Math.trunc(quantity) || 0, 0), 40);
  if (next === 0) {
    await db.delete(cartItems).where(and(eq(cartItems.id, lineId), eq(cartItems.cartId, cart.id)));
  } else {
    await db
      .update(cartItems)
      .set({ quantity: next })
      .where(and(eq(cartItems.id, lineId), eq(cartItems.cartId, cart.id)));
  }

  const count = await countItems(cart.id);
  await writeCountCookie(count);
  return count;
}

/**
 * The line the guest writes under the basket.
 *
 * It is only ever stored on a basket that already exists: a note with nothing
 * to eat beside it is not an order, and minting a cart row for one would leave
 * the database full of empty baskets carrying stray sentences.
 */
export async function setCartNote(note: string): Promise<void> {
  const token = await currentCartToken();
  if (!token) return;

  const trimmed = note.trim().slice(0, 300);
  await db
    .update(carts)
    .set({ note: trimmed || null, updatedAt: new Date() })
    .where(eq(carts.token, token));
}

export async function clearCart(cartId: number) {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await writeCountCookie(0);
}

async function countItems(cartId: number): Promise<number> {
  const rows = await db.select({ quantity: cartItems.quantity }).from(cartItems).where(eq(cartItems.cartId, cartId));
  return rows.reduce((total, row) => total + row.quantity, 0);
}
