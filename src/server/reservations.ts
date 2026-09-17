import 'server-only';

import { randomBytes, randomInt } from 'node:crypto';
import { and, eq, gt, inArray, lt, not, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservationHolds, reservations, restaurantTables, type ReservationStatus } from '@/db/schema';
import { OPERATING_HOURS, RESTAURANT } from '@/lib/restaurant';
import { isoDateInBerlin } from '@/lib/dates';
import type { Locale } from '@/lib/i18n';

/**
 * Table booking, in real time.
 *
 * "Real time" here means the times offered are computed from what is actually
 * free at the moment of asking — tables, existing bookings, and the short holds
 * other guests are sitting on — not from a fixed grid. Two people can want the
 * same 19:30, and only one of them gets it.
 *
 * The floor plan is a placeholder until the restaurant confirms theirs; the
 * rows carry `confirmed: false` so nothing here pretends otherwise.
 */

const HOLD_MINUTES = 8;

/** Statuses that still occupy a table. A cancelled booking frees its slot. */
export const LIVE_STATUSES: ReservationStatus[] = ['requested', 'confirmed', 'seated'];

export type Slot = { minute: number; label: string };

function label(minute: number) {
  const hour = Math.floor(minute / 60) % 24;
  return `${String(hour).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

export function token() {
  return randomBytes(24).toString('base64url');
}

/** A short, sayable reference a guest can read out over the phone. */
export function reference(prefix: string) {
  const alphabet = 'ACDEFGHJKLMNPQRTUVWXY3479';
  let out = '';
  for (let i = 0; i < 6; i += 1) out += alphabet[randomInt(alphabet.length)];
  return `${prefix}-${out}`;
}

/** The service window for a date, in minutes past local midnight. */
export function serviceWindow() {
  return {
    opensMinute: OPERATING_HOURS.dining.opensMinute,
    closesMinute: OPERATING_HOURS.dining.closesMinute,
    confirmed: OPERATING_HOURS.confirmed,
  };
}

async function expireHolds() {
  await db.delete(reservationHolds).where(lt(reservationHolds.expiresAt, new Date()));
}

type Occupancy = { tableId: number | null; startMinute: number; endMinute: number };

/** Anything holding a table on that date: confirmed bookings and live holds. */
export type Executor = typeof db;

/**
 * Takes the handle to query with.
 *
 * Inside a transaction this must be the transaction's own handle. PGlite has a
 * single connection: a query issued on the outer handle while a transaction is
 * open waits for that transaction, which is waiting for the query — and the
 * request never returns.
 */
async function occupancyFor(
  date: string,
  executor: Executor = db,
  ignoreReservationId?: number,
): Promise<Occupancy[]> {
  const booked = await executor
    .select({
      tableId: reservations.tableId,
      startMinute: reservations.startMinute,
      endMinute: reservations.endMinute,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.date, date),
        inArray(reservations.status, LIVE_STATUSES),
        ignoreReservationId === undefined ? sql`true` : not(eq(reservations.id, ignoreReservationId)),
      ),
    );

  const held = await executor
    .select({
      tableId: reservationHolds.tableId,
      startMinute: reservationHolds.startMinute,
      endMinute: reservationHolds.endMinute,
    })
    .from(reservationHolds)
    .where(and(eq(reservationHolds.date, date), gt(reservationHolds.expiresAt, new Date())));

  return [...booked, ...held];
}

function overlaps(a: { startMinute: number; endMinute: number }, b: { startMinute: number; endMinute: number }) {
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute;
}

/**
 * Which table to give a party.
 *
 * Smallest table that fits, so a couple does not eat at a six-top while a party
 * of six is turned away. Returns null when nothing fits at that time.
 */
function pickTable(
  tables: (typeof restaurantTables.$inferSelect)[],
  occupancy: Occupancy[],
  partySize: number,
  startMinute: number,
  endMinute: number,
): number | null {
  const candidates = tables
    .filter((table) => table.active && partySize >= table.seatsMin && partySize <= table.seatsMax)
    .sort((a, b) => a.seatsMax - b.seatsMax || a.id - b.id);

  for (const table of candidates) {
    const busy = occupancy.some(
      (entry) => entry.tableId === table.id && overlaps(entry, { startMinute, endMinute }),
    );
    if (!busy) return table.id;
  }
  return null;
}

export function seatingLength() {
  return RESTAURANT.reservationDurationMinutes + RESTAURANT.reservationBufferMinutes;
}

/**
 * Finds a free table for a sitting, or null.
 *
 * Shared with the intake of bookings from Quandoo and TheFork, so a booking
 * made on a platform is allocated by exactly the same rules as one made here —
 * one allocator, one definition of "free".
 *
 * `ignoreReservationId` lets an existing booking be re-allocated without
 * colliding with itself when a platform sends an update.
 */
export async function allocateTable(
  executor: Executor,
  date: string,
  startMinute: number,
  endMinute: number,
  partySize: number,
  ignoreReservationId?: number,
): Promise<number | null> {
  const tables = await executor.select().from(restaurantTables);
  const occupancy = (await occupancyFor(date, executor, ignoreReservationId)).filter(
    (entry) => entry.tableId !== null,
  );
  return pickTable(tables, occupancy, partySize, startMinute, endMinute);
}

export type Availability =
  | { kind: 'closed' }
  | { kind: 'too_large'; maxParty: number }
  | { kind: 'past' }
  | { kind: 'ok'; slots: Slot[]; durationMinutes: number; hoursConfirmed: boolean };

export async function availability(date: string, partySize: number): Promise<Availability> {
  if (partySize > RESTAURANT.reservationMaxPartyOnline) {
    return { kind: 'too_large', maxParty: RESTAURANT.reservationMaxPartyOnline };
  }
  if (date < isoDateInBerlin()) return { kind: 'past' };

  const window = serviceWindow();
  const lastSeating = window.closesMinute - RESTAURANT.reservationLastSeatingMinutes;
  if (lastSeating <= window.opensMinute) return { kind: 'closed' };

  await expireHolds();
  const tables = await db.select().from(restaurantTables);
  const occupancy = await occupancyFor(date);
  const length = seatingLength();

  // Today's slots start from the next full step, not from opening time — an
  // 18:15 booking made at 20:00 helps nobody.
  const isToday = date === isoDateInBerlin();
  const nowMinute = isToday ? berlinMinuteNow() + RESTAURANT.orderCutoffMinutes : 0;

  const slots: Slot[] = [];
  for (
    let minute = window.opensMinute;
    minute <= lastSeating;
    minute += RESTAURANT.reservationSlotMinutes
  ) {
    if (minute < nowMinute) continue;
    const tableId = pickTable(tables, occupancy, partySize, minute, minute + length);
    if (tableId !== null) slots.push({ minute, label: label(minute) });
  }

  return { kind: 'ok', slots, durationMinutes: RESTAURANT.reservationDurationMinutes, hoursConfirmed: window.confirmed };
}

function berlinMinuteNow(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: RESTAURANT.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

export type HoldResult =
  | { ok: true; token: string; expiresAt: Date; minute: number }
  | { ok: false; reason: 'taken' | 'closed' | 'too_large' | 'past' };

/** Claims a time for a few minutes while the guest fills in the form. */
export async function holdSlot(date: string, minute: number, partySize: number): Promise<HoldResult> {
  if (partySize > RESTAURANT.reservationMaxPartyOnline) return { ok: false, reason: 'too_large' };
  if (date < isoDateInBerlin()) return { ok: false, reason: 'past' };

  const window = serviceWindow();
  const length = seatingLength();
  if (minute < window.opensMinute || minute > window.closesMinute - RESTAURANT.reservationLastSeatingMinutes) {
    return { ok: false, reason: 'closed' };
  }

  await expireHolds();

  // One writer at a time for this date. PGlite is single-connection, but the
  // same code has to be correct against a real Postgres with many workers.
  const lockKey = advisoryKey(date);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${lockKey})`);

    const tables = await tx.select().from(restaurantTables);
    const occupancy = await occupancyFor(date, tx);
    const tableId = pickTable(tables, occupancy, partySize, minute, minute + length);
    if (tableId === null) return { ok: false, reason: 'taken' } as const;

    const holdToken = token();
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
    await tx.insert(reservationHolds).values({
      token: holdToken,
      date,
      startMinute: minute,
      endMinute: minute + length,
      partySize,
      tableId,
      expiresAt,
    });

    return { ok: true, token: holdToken, expiresAt, minute } as const;
  });
}

/** Postgres advisory locks take a bigint; a date maps to one deterministically. */
function advisoryKey(date: string): number {
  let hash = 2166136261;
  for (let i = 0; i < date.length; i += 1) {
    hash ^= date.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}

export type ConfirmInput = {
  holdToken: string;
  name: string;
  email: string;
  phone: string;
  occasion?: string | null;
  note?: string | null;
  locale: Locale;
  autoConfirm: boolean;
};

export type ConfirmResult =
  | { ok: true; token: string; reference: string; status: ReservationStatus; date: string; minute: number; partySize: number }
  | { ok: false; reason: 'hold_expired' | 'taken' };

export async function confirmReservation(input: ConfirmInput): Promise<ConfirmResult> {
  await expireHolds();

  const [hold] = await db
    .select()
    .from(reservationHolds)
    .where(eq(reservationHolds.token, input.holdToken))
    .limit(1);

  if (!hold || hold.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'hold_expired' };

  const lockKey = advisoryKey(hold.date);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${lockKey})`);

    // Re-check against confirmed bookings only: the hold itself is ours.
    const clash = await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.date, hold.date),
          inArray(reservations.status, LIVE_STATUSES),
          hold.tableId === null ? sql`false` : eq(reservations.tableId, hold.tableId),
          lt(reservations.startMinute, hold.endMinute),
          gt(reservations.endMinute, hold.startMinute),
        ),
      )
      .limit(1);

    if (clash.length) {
      await tx.delete(reservationHolds).where(eq(reservationHolds.id, hold.id));
      return { ok: false, reason: 'taken' } as const;
    }

    const status: ReservationStatus = input.autoConfirm ? 'confirmed' : 'requested';
    const guestToken = token();
    const [row] = await tx
      .insert(reservations)
      .values({
        token: guestToken,
        reference: reference('R'),
        status,
        date: hold.date,
        startMinute: hold.startMinute,
        endMinute: hold.endMinute,
        partySize: hold.partySize,
        tableId: hold.tableId,
        name: input.name.trim().slice(0, 120),
        email: input.email.trim().slice(0, 160),
        phone: input.phone.trim().slice(0, 40),
        occasion: input.occasion?.trim().slice(0, 120) || null,
        note: input.note?.trim().slice(0, 500) || null,
        locale: input.locale,
      })
      .returning();

    await tx.delete(reservationHolds).where(eq(reservationHolds.id, hold.id));

    return {
      ok: true,
      token: row.token,
      reference: row.reference,
      status: row.status,
      date: row.date,
      minute: row.startMinute,
      partySize: row.partySize,
    } as const;
  });
}

export async function getReservationByToken(guestToken: string) {
  const [row] = await db.select().from(reservations).where(eq(reservations.token, guestToken)).limit(1);
  return row ?? null;
}

export type CancelResult = { ok: true } | { ok: false; reason: 'not_found' | 'too_late' | 'already' };

export async function cancelReservation(guestToken: string): Promise<CancelResult> {
  const row = await getReservationByToken(guestToken);
  if (!row) return { ok: false, reason: 'not_found' };
  if (!LIVE_STATUSES.includes(row.status)) return { ok: false, reason: 'already' };

  // Inside the last two hours the kitchen has already planned around the table;
  // that conversation belongs on the phone, not in a form.
  const startsAt = new Date(`${row.date}T00:00:00Z`).getTime() + row.startMinute * 60_000;
  if (startsAt - Date.now() < 2 * 60 * 60_000) return { ok: false, reason: 'too_late' };

  await db
    .update(reservations)
    .set({ status: 'cancelled_by_guest', updatedAt: new Date() })
    .where(and(eq(reservations.id, row.id), not(eq(reservations.status, 'cancelled_by_guest'))));

  return { ok: true };
}
