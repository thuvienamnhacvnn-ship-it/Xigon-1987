import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { hit } from './rate-limit';
import { secureCookies } from './cookie-security';

/**
 * Who is allowed into the back office.
 *
 * The reservation screens hold guests' names, telephone numbers and email
 * addresses. That is a different class of thing from the promotions screen,
 * which holds pictures of food — so this one is never open, not even on
 * localhost. Without `XIGON_ADMIN_PASSWORD` the back office simply does not
 * open, and says so rather than letting anyone in.
 *
 * The session is a signed cookie rather than a row in a table: there is one
 * operator, the secret lives in the environment, and a stateless token means
 * no session table to expire, leak or forget to clean up.
 */

const COOKIE = 'xigon_admin';
const MAX_AGE_SECONDS = 60 * 60 * 12;

function secret(): string | null {
  const password = process.env.XIGON_ADMIN_PASSWORD;
  if (!password) return null;
  // The signing key is derived from the password, so changing the password
  // invalidates every session that was issued under the old one.
  return createHmac('sha256', 'xigon-admin-session').update(password).digest('hex');
}

export function adminConfigured(): boolean {
  return Boolean(secret());
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // Length is public; the contents are compared in constant time.
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Verifies the password and issues a session. Rate limited per address. */
export async function signIn(password: string): Promise<'ok' | 'wrong' | 'not_configured' | 'rate_limited'> {
  const key = secret();
  if (!key) return 'not_configured';

  const head = await headers();
  const subject = head.get('x-forwarded-for')?.split(',')[0].trim() || head.get('x-real-ip') || 'local';
  if (!(await hit('admin-login', subject, 8, 10 * 60_000))) return 'rate_limited';

  const expected = process.env.XIGON_ADMIN_PASSWORD ?? '';
  if (!equals(password, expected)) return 'wrong';

  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${expires}.${randomBytes(9).toString('base64url')}`;
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload, key)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: await secureCookies(),
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  return 'ok';
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** True when this request carries a valid, unexpired session. */
export async function isSignedIn(): Promise<boolean> {
  const key = secret();
  if (!key) return false;

  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return false;

  const parts = raw.split('.');
  if (parts.length !== 3) return false;
  const [expires, nonce, signature] = parts;

  if (!equals(signature, sign(`${expires}.${nonce}`, key))) return false;
  return Number(expires) > Date.now();
}

/**
 * The guard every admin action calls first.
 *
 * It throws rather than returning a flag, so a forgotten check is a crash in
 * development instead of an open door in production.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isSignedIn())) throw new Error('admin: not signed in');
}
