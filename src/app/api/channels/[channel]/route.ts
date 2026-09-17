import { NextResponse, type NextRequest } from 'next/server';
import { getChannel } from '@/server/channels';
import { applyBooking, logEvent } from '@/server/channels/intake';

/**
 * Where bookings from Quandoo, TheFork and any bridge service arrive.
 *
 * The order of operations is deliberate:
 *   1. read the raw body — a signature is over bytes, and re-serialising JSON
 *      changes them
 *   2. check the signature
 *   3. store the payload, whatever it turns out to be
 *   4. only then interpret it
 *
 * Step 3 comes before step 4 so that a payload we cannot yet parse is still on
 * disk to look at, and a fixed parser can be replayed over it later. Step 2
 * comes before step 3 so a stranger cannot fill the table with rubbish.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ channel: string }> }) {
  const { channel: channelId } = await context.params;
  const channel = getChannel(channelId);
  if (!channel) return NextResponse.json({ error: 'unknown_channel' }, { status: 404 });

  if (!channel.configured()) {
    // Nothing is stored: without a secret we cannot tell this from any other
    // request on the open internet.
    return NextResponse.json({ error: 'channel_not_configured' }, { status: 503 });
  }

  const raw = await request.text();
  const verified = channel.verify(raw, request.headers);
  if (!verified.ok) {
    return NextResponse.json({ error: 'bad_signature', reason: verified.reason }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const booking = channel.parse(payload);

  const eventId = await logEvent({
    channel: channel.id,
    kind: booking?.action ?? 'unrecognised',
    payload,
    signatureOk: true,
    externalEventId: booking?.eventId ?? null,
  });

  // A null id means this event id has already been seen: a retry, not new news.
  if (eventId === null) return NextResponse.json({ ok: true, outcome: 'replay' });

  if (!booking) {
    return NextResponse.json({ error: 'unrecognised_payload' }, { status: 422 });
  }

  const result = await applyBooking(channel.id, booking, eventId);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });

  return NextResponse.json({
    ok: true,
    outcome: result.outcome,
    // Told plainly, so the platform's own log shows that the booking landed but
    // still needs a person.
    needsAttention: result.conflict,
  });
}
