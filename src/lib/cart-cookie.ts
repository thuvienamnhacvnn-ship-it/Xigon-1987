/**
 * Cookie names shared by the server routes and the layout.
 *
 * The cart itself lives in the database; the cookie carries only the id and a
 * count, so the header badge costs no query on a cached page.
 */
export const CART_COOKIE = 'xigon_cart';
export const CART_COUNT_COOKIE = 'xigon_cart_n';
export const CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
