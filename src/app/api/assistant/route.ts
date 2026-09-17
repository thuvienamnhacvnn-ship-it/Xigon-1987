import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ask } from '@/server/assistant';
import { hit } from '@/server/rate-limit';
import { locales } from '@/lib/i18n';

/**
 * The menu guide's endpoint.
 *
 * Rate limited per address, because this route can cost money per call and an
 * open one is somebody else's budget. The reply is never cached: it depends on
 * what is on the card and what is sold out today.
 */
export const dynamic = 'force-dynamic';

const schema = z.object({
  question: z.string().trim().min(2).max(600),
  locale: z.enum(locales),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const subject =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'local';

  const allowed = await hit('assistant', subject, 20, 10 * 60_000);
  if (!allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const result = await ask(parsed.data.locale, parsed.data.question);

  return NextResponse.json(
    { answer: result.answer, suggestions: result.suggestions, grounded: result.grounded },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
