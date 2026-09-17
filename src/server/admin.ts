import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  channelEvents,
  reservations,
  restaurantTables,
  type ReservationChannel,
  type ReservationStatus,
} from '@/db/schema';
import { LIVE_STATUSES, allocateTable, reference, seatingLength, token } from './reservations';

/**
 * The reservation book, as the people working the floor need it.
 *
 * One day at a time, in time order, with the things that need a decision at the
 * top — a booking a platform sent us that has no table, and requests waiting to
 * be confirmed. Everything else is chronological, because that is how a service
 * actually runs.
 */

export type BookRow = {
  id: number;
  reference: string;
  token: string;
  status: ReservationStatus;
  channel: ReservationChannel;
  conflict: boolean;
  date: string;
  startMinute: number;
  endMinute: number;
  partySize: number;
  tableId: number | null;
  tableCode: string | null;
  name: string;
  email: string;
  phone: string;
  occasion: string | null;
  note: string | null;
  staffNote: string | null;
  createdAt: Date;
};

export type DayBook = {
  date: string;
  rows: BookRow[];
  tables: { id: number; code: string; seatsMin: number; seatsMax: number; active: boolean }[];
  counts: { live: number; covers: number; requested: number; conflicts: number };
};

export async function dayBook(date: string): Promise<DayBook> {
  const rows = await db
    .select({ reservation: reservations, table: restaurantTables })
    .from(reservations)
    .leftJoin(restaurantTables, eq(reservations.tableId, restaurantTables.id))
    .where(eq(reservations.date, date))
    .orderBy(asc(reservations.startMinute), asc(reservations.id));

  const tables = await db.select().from(restaurantTables).orderBy(asc(restaurantTables.id));

  const mapped: BookRow[] = rows.map(({ reservation, table }) => ({
    id: reservation.id,
    reference: reservation.reference,
    token: reservation.token,
    status: reservation.status,
    channel: reservation.channel,
    conflict: reservation.conflict,
    date: reservation.date,
    startMinute: reservation.startMinute,
    endMinute: reservation.endMinute,
    partySize: reservation.partySize,
    tableId: reservation.tableId,
    tableCode: table?.code ?? null,
    name: reservation.name,
    email: reservation.email,
    phone: reservation.phone,
    occasion: reservation.occasion,
    note: reservation.note,
    staffNote: reservation.staffNote,
    createdAt: reservation.createdAt,
  }));

  const live = mapped.filter((row) => LIVE_STATUSES.includes(row.status));

  return {
    date,
    rows: mapped,
    tables: tables.map((table) => ({
      id: table.id,
      code: table.code,
      seatsMin: table.seatsMin,
      seatsMax: table.seatsMax,
      active: table.active,
    })),
    counts: {
      live: live.length,
      covers: live.reduce((total, row) => total + row.partySize, 0),
      requested: mapped.filter((row) => row.status === 'requested').length,
      conflicts: mapped.filter((row) => row.conflict).length,
    },
  };
}

export async function setStatus(id: number, status: ReservationStatus): Promise<void> {
  // Freeing the table is part of cancelling, not a separate step somebody has
  // to remember: a cancelled booking that keeps its table blocks the evening.
  const releases = !LIVE_STATUSES.includes(status);
  await db
    .update(reservations)
    .set({ status, updatedAt: new Date(), ...(releases ? { tableId: null, conflict: false } : {}) })
    .where(eq(reservations.id, id));
}

export type AssignResult = { ok: true } | { ok: false; reason: 'taken' | 'not_found' };

/**
 * Puts a booking on a table, or takes it off one.
 *
 * The check is the same one the booking form uses, so a table cannot be given
 * out twice by going through the back office instead of the front.
 */
export async function assignTable(id: number, tableId: number | null): Promise<AssignResult> {
  const [row] = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
  if (!row) return { ok: false, reason: 'not_found' };

  if (tableId === null) {
    await db.update(reservations).set({ tableId: null, updatedAt: new Date() }).where(eq(reservations.id, id));
    return { ok: true };
  }

  const clash = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.date, row.date),
        eq(reservations.tableId, tableId),
        inArray(reservations.status, LIVE_STATUSES),
      ),
    );

  const overlapping = clash.some((entry) => entry.id !== id);
  if (overlapping) return { ok: false, reason: 'taken' };

  await db
    .update(reservations)
    .set({ tableId, conflict: false, updatedAt: new Date() })
    .where(eq(reservations.id, id));
  return { ok: true };
}

export async function setStaffNote(id: number, note: string): Promise<void> {
  await db
    .update(reservations)
    .set({ staffNote: note.trim().slice(0, 500) || null, updatedAt: new Date() })
    .where(eq(reservations.id, id));
}

export type StaffBookingInput = {
  date: string;
  time: string;
  partySize: number;
  name: string;
  phone: string;
  email?: string | null;
  note?: string | null;
  channel: Extract<ReservationChannel, 'phone' | 'walk_in'>;
};

export type StaffBookingResult =
  | { ok: true; id: number; reference: string; tableId: number | null }
  | { ok: false; reason: 'no_table' };

/**
 * A booking taken over the telephone, or a party that simply walked in.
 *
 * Unlike the guest-facing form this does not refuse when nothing is free: the
 * people on the floor can see the room and may know something the table plan
 * does not. It is recorded without a table and flagged, rather than blocked.
 */
export async function createByStaff(input: StaffBookingInput): Promise<StaffBookingResult> {
  const [hour, minute] = input.time.split(':').map(Number);
  const startMinute = hour * 60 + minute;
  const endMinute = startMinute + seatingLength();

  const tableId = await allocateTable(db, input.date, startMinute, endMinute, input.partySize);

  const [row] = await db
    .insert(reservations)
    .values({
      token: token(),
      reference: reference(input.channel === 'walk_in' ? 'W' : 'T'),
      status: 'confirmed',
      date: input.date,
      startMinute,
      endMinute,
      partySize: input.partySize,
      tableId,
      conflict: tableId === null,
      name: input.name.trim().slice(0, 120),
      email: (input.email ?? '').trim().slice(0, 160),
      phone: input.phone.trim().slice(0, 40),
      note: input.note?.trim().slice(0, 500) || null,
      channel: input.channel,
      locale: 'de',
    })
    .returning({ id: reservations.id, reference: reservations.reference });

  return { ok: true, id: row.id, reference: row.reference, tableId };
}

export type EventRow = {
  id: number;
  channel: ReservationChannel;
  kind: string;
  signatureOk: boolean;
  result: string | null;
  receivedAt: Date;
  reservationId: number | null;
};

/** The last thing each platform sent, for the channel screen. */
export async function recentEvents(limit = 25): Promise<EventRow[]> {
  const rows = await db
    .select({
      id: channelEvents.id,
      channel: channelEvents.channel,
      kind: channelEvents.kind,
      signatureOk: channelEvents.signatureOk,
      result: channelEvents.result,
      receivedAt: channelEvents.receivedAt,
      reservationId: channelEvents.reservationId,
    })
    .from(channelEvents)
    .orderBy(desc(channelEvents.receivedAt))
    .limit(limit);
  return rows;
}
