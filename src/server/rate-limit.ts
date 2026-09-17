import 'server-only';

import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { rateLimits } from '@/db/schema';

/**
 * A fixed-window counter in the database.
 *
 * In the database rather than in memory so the limit survives a restart and
 * still holds when the app runs as more than one process — an in-memory counter
 * on three workers is three times the limit.
 */
export async function hit(bucket: string, subject: string, limit: number, windowMs: number): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  try {
    const [row] = await db
      .insert(rateLimits)
      .values({ bucket, subject: subject.slice(0, 120), windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [rateLimits.bucket, rateLimits.subject, rateLimits.windowStart],
        set: { count: sql`${rateLimits.count} + 1` },
      })
      .returning();

    // Old windows are swept opportunistically; no scheduler needed for a table
    // that only ever holds a few rows per address.
    if (row.count === 1) {
      await db
        .delete(rateLimits)
        .where(and(eq(rateLimits.bucket, bucket), lt(rateLimits.windowStart, new Date(Date.now() - windowMs * 4))));
    }

    return row.count <= limit;
  } catch {
    // If the counter itself fails, let the request through rather than taking
    // the feature down; the failure is in our bookkeeping, not the guest's.
    return true;
  }
}
