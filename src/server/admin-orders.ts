import 'server-only';

import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from '@/db/client';
import { orderItems, orders, type OrderStatus } from '@/db/schema';
import { formatMinute } from '@/lib/dates';

/**
 * The kitchen's view of the day's orders, and the counter's view of payment.
 *
 * Two jobs that look like one and are not. What the kitchen needs to know is
 * whether to start cooking; what the counter needs to know is whether money has
 * arrived. They are kept as separate fields — `status` and the payment trio —
 * because an order can perfectly well be cooked and unpaid, or paid and
 * cancelled, and a single "state" that tries to cover both ends up lying about
 * one of them.
 */

export type OrderLine = {
  name: string;
  variantLabel: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
  note: string | null;
};

export type OrderRow = {
  id: number;
  reference: string;
  token: string;
  status: OrderStatus;
  fulfilment: 'pickup' | 'delivery';
  name: string;
  email: string;
  phone: string;
  slotDate: string;
  slotMinute: number;
  slotLabel: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paymentProvider: string | null;
  paymentReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  lines: OrderLine[];
};

/** Orders whose day has not finished with them yet. */
export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  'awaiting_payment',
  'placed',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
];

/**
 * Every order for a collection date, oldest slot first.
 *
 * Cancelled and rejected orders are included rather than filtered out: the
 * question the counter is usually asking is "what happened to my order", and
 * an order that has vanished from the screen cannot answer it.
 */
export async function orderBook(date: string): Promise<OrderRow[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.slotDate, date))
    .orderBy(asc(orders.slotMinute), asc(orders.id));

  if (!rows.length) return [];

  const items = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(orderItems.id));

  const byOrder = new Map<number, OrderLine[]>();
  for (const item of items) {
    const list = byOrder.get(item.orderId) ?? [];
    list.push({
      name: item.nameSnapshot,
      variantLabel: item.variantSnapshot ?? '',
      quantity: item.quantity,
      unitCents: item.unitPriceCents,
      totalCents: item.totalCents,
      note: item.note,
    });
    byOrder.set(item.orderId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    token: row.token,
    status: row.status,
    fulfilment: row.fulfilment,
    name: row.name,
    email: row.email,
    phone: row.phone,
    slotDate: row.slotDate,
    slotMinute: row.slotMinute,
    slotLabel: formatMinute(row.slotMinute),
    subtotalCents: row.subtotalCents,
    taxCents: row.taxCents,
    totalCents: row.totalCents,
    paymentProvider: row.paymentProvider,
    paymentReference: row.paymentReference,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    lines: byOrder.get(row.id) ?? [],
  }));
}

/**
 * Everything still waiting for money, whatever day it is for.
 *
 * Unpaid orders are swept after half an hour, so this list is normally short
 * and normally empty. When it is not, somebody chose a payment method, no
 * provider took the money — because none is connected — and the counter has to
 * decide: it was paid at the door, or it was never an order at all.
 */
export async function unpaidOrders(): Promise<OrderRow[]> {
  const rows = await db
    .select({ slotDate: orders.slotDate })
    .from(orders)
    .where(eq(orders.status, 'awaiting_payment'))
    .orderBy(desc(orders.createdAt));

  const dates = [...new Set(rows.map((row) => row.slotDate))];
  const books = await Promise.all(dates.map((date) => orderBook(date)));
  return books.flat().filter((order) => order.status === 'awaiting_payment');
}

export async function setOrderStatus(id: number, status: OrderStatus): Promise<void> {
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
}

/**
 * Records that the money arrived.
 *
 * It does not take a payment — nothing here can, because no provider is
 * connected. It writes down that a person at the counter saw it happen, and
 * who to ask if the figure is ever questioned. `paidAt` is the moment it was
 * recorded, not a moment invented from the order.
 */
export async function markPaid(id: number, reference: string | null): Promise<void> {
  await db
    .update(orders)
    .set({
      status: 'placed',
      paidAt: new Date(),
      paymentReference: reference?.trim().slice(0, 120) || null,
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, id), eq(orders.status, 'awaiting_payment')));
}

/** The takings for a day, counted from what was actually paid. */
export type DayTakings = {
  paidCount: number;
  paidCents: number;
  taxCents: number;
  openCount: number;
  unpaidCount: number;
  unpaidCents: number;
};

export async function takingsFor(date: string): Promise<DayTakings> {
  const rows = await orderBook(date);

  /*
   * Counted from `paidAt`, not from the status.
   *
   * A completed order that was never paid is not takings, and a paid order
   * that was later cancelled is money that has to be given back — which is a
   * different question from whether the kitchen finished it. Only the payment
   * field can answer the money question honestly.
   */
  const paid = rows.filter((row) => row.paidAt !== null && row.status !== 'cancelled' && row.status !== 'rejected');
  const unpaid = rows.filter((row) => row.paidAt === null && OPEN_ORDER_STATUSES.includes(row.status));

  return {
    paidCount: paid.length,
    paidCents: paid.reduce((total, row) => total + row.totalCents, 0),
    taxCents: paid.reduce((total, row) => total + row.taxCents, 0),
    openCount: rows.filter((row) => OPEN_ORDER_STATUSES.includes(row.status)).length,
    unpaidCount: unpaid.length,
    unpaidCents: unpaid.reduce((total, row) => total + row.totalCents, 0),
  };
}

/** Orders in a range, for the takings screen's week view. */
export async function orderCountBetween(from: string, to: string): Promise<number> {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(gte(orders.slotDate, from), lte(orders.slotDate, to)));
  return rows.length;
}
