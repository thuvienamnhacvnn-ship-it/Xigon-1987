import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { externalBookingSchema, type ChannelAdapter, type ChannelStatus, type ExternalBooking, type VerifyResult } from './types';
import type { ReservationChannel } from '@/db/schema';

/**
 * The booking platforms.
 *
 * What is honest about this file, and what is not, stated plainly because it
 * decides how much you can trust it:
 *
 *   • The plumbing is real and finished — signature checking, replay
 *     protection, the mapping into our own booking shape, the conflict rules,
 *     the audit log. Point any platform at it and bookings land correctly.
 *
 *   • The *wire format* of Quandoo and TheFork is not. Both are partner APIs:
 *     you sign an agreement, they issue credentials and documentation, and
 *     neither is public. Rather than invent endpoint paths and field names that
 *     would look right and be wrong, each adapter accepts the normalised shape
 *     below and its `parse` refuses anything else.
 *
 * So today the working route is a bridge — Zapier, Make, n8n, or the platform's
 * own outgoing webhook if it can be shaped — posting this JSON to
 * `/api/channels/<platform>` with an HMAC signature. When the real partner
 * documentation arrives, only `parse` and `verify` change; nothing that touches
 * the reservation book has to move.
 *
 *   {
 *     "externalId": "Q-99123",
 *     "action": "booked" | "updated" | "cancelled",
 *     "date": "2026-09-20",
 *     "time": "19:30",
 *     "partySize": 4,
 *     "name": "Anna Muster",
 *     "email": "anna@example.com",
 *     "phone": "+49301234567",
 *     "note": "Fensterplatz",
 *     "eventId": "evt_123"
 *   }
 *
 * Signature: `X-Xigon-Signature: sha256=<hex>`, an HMAC-SHA256 of the exact
 * request body using the platform's secret.
 */

function verifyHmac(rawBody: string, headers: Headers, secret: string | undefined): VerifyResult {
  if (!secret) return { ok: false, reason: 'no_secret' };

  const header = headers.get('x-xigon-signature') ?? '';
  const given = header.startsWith('sha256=') ? header.slice(7) : header;
  if (!given) return { ok: false, reason: 'no_signature' };

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' };
  return { ok: true };
}

function parseNormalised(payload: unknown): ExternalBooking | null {
  const parsed = externalBookingSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

function adapter(id: ReservationChannel, label: string, envKey: string, docsNote: string): ChannelAdapter {
  return {
    id,
    label,
    docsNote,
    configured: () => Boolean(process.env[envKey]),
    verify: (rawBody, headers) => verifyHmac(rawBody, headers, process.env[envKey]),
    parse: parseNormalised,
  };
}

export const CHANNELS: Record<string, ChannelAdapter> = {
  quandoo: adapter(
    'quandoo',
    'Quandoo',
    'QUANDOO_WEBHOOK_SECRET',
    'Quandoo Partner API. Zugangsdaten gibt es nur mit Partnervertrag; bis dahin über einen Bridge-Dienst (Zapier, Make, n8n) auf diesen Endpunkt.',
  ),
  thefork: adapter(
    'thefork',
    'TheFork',
    'THEFORK_WEBHOOK_SECRET',
    'TheFork Partner API (Tripadvisor). Zugangsdaten nur mit Partnervertrag; bis dahin über einen Bridge-Dienst auf diesen Endpunkt.',
  ),
  import: adapter(
    'import',
    'Anderer Dienst',
    'IMPORT_WEBHOOK_SECRET',
    'Für jede weitere Plattform oder einen eigenen Bridge-Dienst. Gleiches Format, eigener Schlüssel.',
  ),
};

export function getChannel(id: string): ChannelAdapter | null {
  return CHANNELS[id] ?? null;
}

const ENV_KEY: Record<string, string> = {
  quandoo: 'QUANDOO_WEBHOOK_SECRET',
  thefork: 'THEFORK_WEBHOOK_SECRET',
  import: 'IMPORT_WEBHOOK_SECRET',
};

export function channelStatuses(): ChannelStatus[] {
  return Object.values(CHANNELS).map((channel) => ({
    id: channel.id,
    label: channel.label,
    configured: channel.configured(),
    missing: channel.configured() ? [] : [ENV_KEY[channel.id]],
    docsNote: channel.docsNote,
    webhookPath: `/api/channels/${channel.id}`,
  }));
}
