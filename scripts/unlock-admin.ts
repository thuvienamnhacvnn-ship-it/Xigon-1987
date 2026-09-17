/**
 * Lifts the back office's login lockout.
 *
 * Eight wrong passwords lock the sign-in for ten minutes, which is there to
 * stop someone guessing their way in. It also catches the restaurant: type the
 * old password a few times on a phone keyboard and the right one stops working
 * too, with no way to tell the difference from the outside — the screen says
 * the same thing either way.
 *
 * This clears the counters and nothing else. It cannot change the password and
 * it cannot sign anyone in; whoever runs it already has the server.
 *
 * PGlite lets one process hold the data directory, so stop the service first:
 *
 *   systemctl stop xigon1987
 *   npm run admin:unlock
 *   systemctl start xigon1987
 *
 * It goes through `npm run` rather than bare `tsx` because everything under
 * `src/server` imports `server-only`, which throws outside Next — the script
 * tsconfig maps that import to a stub.
 */
import { eq } from 'drizzle-orm';
import { db } from '../src/db/client';
import { rateLimits } from '../src/db/schema';

const removed = await db.delete(rateLimits).where(eq(rateLimits.bucket, 'admin-login')).returning();

console.log(`cleared ${removed.length} login lockout counter(s)`);
