import 'server-only';

import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { channelEvents, reservations, type ReservationChannel } from '@/db/schema';
import { allocateTable, reference, seatingLength, token } from '../reservations';
import type { ExternalBooking } from './types';

/**
 * Taking a booking that was made somewhere else.
 *
 * The rule that decides everything here: a booking on Quandoo or TheFork has
 * already been confirmed to the guest by that platform. We cannot un-tell them.
 * So an arriving booking is *always* recorded, even when there is no table left
 * for it — in that case it is recorded with `conflict` set and no table, and it
 * appears at the top of the day's list for a human to sort out. Silently
 * dropping it, or silently double-booking a table, are both worse than an
 * awkward row in the book.
 */

export type IntakeResult =
  | { ok: true; reservationId: number; outcome: 'created' | 'updated' | 'cancelled'; conflict: boolean }
  | { ok: false; reason: 'replay' | 'invalid' };

function minutesFrom(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

/**
 * Records the raw payload before anything is interpreted.
 *
 * Returns null when the platform's own event id has been seen before, which is
 * how a retried delivery is dropped without touching the book.
 */
export async function logEvent(input: {
  channel: ReservationChannel;
  kind: string;
  payload: unknown;
  signatureOk: boolean;
  externalEventId?: string | null;
}): Promise<number | null> {
  const [row] = await db
    .insert(channelEvents)
    .values({
      channel: input.channel,
      kind: input.kind,
      payload: input.payload as object,
      signatureOk: input.signatureOk,
      externalEventId: input.externalEventId ?? null,
    })
    .onConflictDoNothing({ target: [channelEvents.channel, channelEvents.externalEventId] })
    .returning({ id: channelEvents.id });

  return row?.id ?? null;
}

/**
 * Records how an event ended.
 *
 * Never called from inside the booking transaction. PGlite has one connection:
 * a write on the outer handle while a transaction is open waits for that
 * transaction, which is waiting for the write, and the request never returns.
 * The transaction therefore returns its outcome and this runs afterwards.
 */
async function finishEvent(eventId: number | null, result: string, reservationId?: number) {
  if (eventId === null) return;
  await db
    .update(channelEvents)
    .set({ result, reservationId: reservationId ?? null })
    .where(eq(channelEvents.id, eventId));
}

export async function applyBooking(
  channel: ReservationChannel,
  booking: ExternalBooking,
  eventId: number | null,
): Promise<IntakeResult> {
  const startMinute = minutesFrom(booking.time);
  const endMinute = startMinute + seatingLength();

  const [existing] = await db
    .select()
    .from(reservations)
    .where(and(eq(reservations.channel, channel), eq(reservations.externalId, booking.externalId)))
    .limit(1);

  /* ------------------------------------------------------------ cancelled */
  if (booking.action === 'cancelled') {
    if (!existing) {
      await finishEvent(eventId, 'cancellation for a booking we never had');
      return { ok: false, reason: 'invalid' };
    }
    await db
      .update(reservations)
      .set({
        status: 'cancelled_by_guest',
        tableId: null,
        conflict: false,
        externalPayload: booking as object,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, existing.id));

    await finishEvent(eventId, 'cancelled', existing.id);
    return { ok: true, reservationId: existing.id, outcome: 'cancelled', conflict: false };
  }

  /* -------------------------------------------------- booked or updated -- */
  // One writer per date, so two platforms cannot be handed the same last table.
  const lockKey = advisoryKey(booking.date);

  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${lockKey})`);

    const tableId = await allocateTable(
      tx,
      booking.date,
      startMinute,
      endMinute,
      booking.partySize,
      existing?.id,
    );
    const conflict = tableId === null;

    const fields = {
      // The platform already told the guest yes, so it arrives confirmed.
      status: 'confirmed' as const,
      date: booking.date,
      startMinute,
      endMinute,
      partySize: booking.partySize,
      tableId,
      conflict,
      name: booking.name,
      email: booking.email ?? '',
      phone: booking.phone ?? '',
      note: booking.note ?? null,
      channel,
      externalId: booking.externalId,
      externalPayload: booking as object,
      updatedAt: new Date(),
    };

    if (existing) {
      await tx.update(reservations).set(fields).where(eq(reservations.id, existing.id));
      return { reservationId: existing.id, outcome: 'updated' as const, conflict };
    }

    const [created] = await tx
      .insert(reservations)
      .values({
        ...fields,
        token: token(),
        reference: reference(channel === 'quandoo' ? 'Q' : channel === 'thefork' ? 'F' : 'X'),
        locale: 'de',
      })
      .returning({ id: reservations.id });

    return { reservationId: created.id, outcome: 'created' as const, conflict };
  });

  await finishEvent(
    eventId,
    `${outcome.outcome}${outcome.conflict ? ', no free table' : ''}`,
    outcome.reservationId,
  );
  return { ok: true, ...outcome };
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
