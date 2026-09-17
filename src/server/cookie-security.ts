import 'server-only';

import { headers } from 'next/headers';

/**
 * Whether this request's cookies may carry the `Secure` attribute.
 *
 * It used to be `process.env.NODE_ENV === 'production'`, which is a statement
 * about how the code was built rather than about how the guest reached it. On
 * the first server this was deployed to — a bare port, no certificate yet — the
 * two disagreed: every cookie went out marked `Secure`, the browser dropped all
 * of them over plain HTTP, and so the basket forgot every dish the moment it
 * was added and the back office could not hold a login. The site looked whole
 * and did nothing.
 *
 * So the flag now follows the connection. Behind a TLS terminator the proxy
 * says so in `x-forwarded-proto` and the cookies are marked `Secure`, which is
 * what protects them; on a plain port there is no such header and marking them
 * would only mean throwing them away. `XIGON_SECURE_COOKIES=1` forces it on for
 * the unusual case of a server holding its own certificate with no proxy in
 * front to set the header.
 *
 * This is not a way of turning security off: a cookie marked `Secure` on a
 * connection that is not secure protects nothing, it just stops working.
 */
export async function secureCookies(): Promise<boolean> {
  if (process.env.XIGON_SECURE_COOKIES === '1') return true;

  try {
    const head = await headers();
    /* A chain of proxies appends, so the first entry is the guest's own hop. */
    const proto = head.get('x-forwarded-proto')?.split(',')[0]?.trim();
    return proto === 'https';
  } catch {
    /* No request to read — a script or a background sweep. Nothing is being
       sent to a browser, so the answer does not matter; false is the one that
       cannot throw an exception into a caller that was only writing a cookie. */
    return false;
  }
}
