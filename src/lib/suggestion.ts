/**
 * A dish the menu guide proposed.
 *
 * It lives here rather than beside the guide's server code because the screen
 * that renders it runs in the browser, and a client component may not reach
 * into a `server-only` module. It was previously declared twice — once on each
 * side — which is exactly how the guide came to send a plate cut-out id where
 * the screen was reading a photograph id.
 *
 * Ids are strings here even though the database uses integers: they travel
 * through JSON and go back to the server as form values, and a number that has
 * been a string once is a number that gets compared as a string eventually.
 */
export type Suggestion = {
  dishId: string;
  variantId: string;
  slug: string;
  code: string | null;
  name: string;
  variantLabel: string;
  priceCents: number;
  /** An id in public/img/dish. Null when the dish has not been photographed. */
  photoId: string | null;
  soldOut: boolean;
  /** Drinks and table-service dishes are never sent out for collection. */
  orderable: boolean;
};
