import 'server-only';

import { z } from 'zod';
import type { ReservationChannel } from '@/db/schema';

/**
 * Bookings that arrive from somewhere else.
 *
 * Every platform describes a booking differently, so nothing downstream ever
 * sees a platform's own payload: an adapter turns it into `ExternalBooking`
 * and the rest of the system only knows that shape. Adding a platform is a new
 * adapter, not a change to the reservation code.
 */

export const externalBookingSchema = z.object({
  /** The id the platform knows it by. Replays of the same id update, not duplicate. */
  externalId: z.string().trim().min(1).max(120),
  /** `cancelled` arrives as its own event; the booking is not deleted. */
  action: z.enum(['booked', 'updated', 'cancelled']).default('booked'),

  /** Local date in Europe/Berlin. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** 24-hour local time, HH:MM. */
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  partySize: z.coerce.number().int().min(1).max(40),

  name: z.string().trim().min(1).max(120),
  email: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),

  /** The platform's own event id, when it sends one, so replays can be dropped. */
  eventId: z.string().trim().max(120).optional().nullable(),
});

export type ExternalBooking = z.infer<typeof externalBookingSchema>;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'no_secret' | 'no_signature' | 'bad_signature' };

export type ChannelAdapter = {
  id: ReservationChannel;
  label: string;
  /** Where the operator gets the credentials, shown on the channel screen. */
  docsNote: string;

  /** True when the environment holds everything this adapter needs. */
  configured(): boolean;

  /**
   * Checks that a request really came from the platform.
   *
   * Takes the raw body, not the parsed object: a signature is over bytes, and
   * re-serialising JSON changes the bytes.
   */
  verify(rawBody: string, headers: Headers): VerifyResult;

  /**
   * Turns the platform's payload into our shape, or returns null if it is not
   * something we understand. Returning null is a refusal, not a crash — the
   * event is still stored, so an unknown payload can be looked at later.
   */
  parse(payload: unknown): ExternalBooking | null;
};

/** What the adapter needs from the environment, for the status screen. */
export type ChannelStatus = {
  id: ReservationChannel;
  label: string;
  configured: boolean;
  missing: string[];
  docsNote: string;
  webhookPath: string;
};
