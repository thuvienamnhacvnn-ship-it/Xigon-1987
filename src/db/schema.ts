/**
 * Database schema.
 *
 * Postgres dialect, running on PGlite in development because a real Postgres
 * server cannot be installed on this machine. Everything is written so the
 * same SQL runs unchanged against a normal Postgres in production.
 *
 * Two rules run through the whole design:
 *   1. Money is integer cents. No floats anywhere near a price.
 *   2. Anything a guest is shown that we could not verify carries its own
 *      `confirmed` flag, so the page can say so instead of pretending.
 */
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------ menu -- */

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull(),
    sort: integer('sort').notNull().default(0),
    nameDe: text('name_de').notNull(),
    nameEn: text('name_en'),
    nameVi: text('name_vi'),
    noteDe: text('note_de'),
    noteEn: text('note_en'),
    noteVi: text('note_vi'),
    published: boolean('published').notNull().default(true),
  },
  (table) => [uniqueIndex('categories_slug_key').on(table.slug)],
);

export const dishes = pgTable(
  'dishes',
  {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 120 }).notNull(),
    /** The number printed on the paper menu, e.g. "X1". Not every dish has one. */
    code: varchar('code', { length: 12 }),
    sort: integer('sort').notNull().default(0),

    nameDe: text('name_de').notNull(),
    nameEn: text('name_en'),
    nameVi: text('name_vi'),
    descriptionDe: text('description_de'),
    descriptionEn: text('description_en'),
    descriptionVi: text('description_vi'),
    ingredientsDe: text('ingredients_de'),
    ingredientsEn: text('ingredients_en'),
    ingredientsVi: text('ingredients_vi'),

    /**
     * An id in public/img/dish — the restaurant's own photograph of the plate,
     * built at 480/720/1080 with an lqip. This is what the card, the detail
     * panel and the basket all show; the menu is the one screen where the
     * photography does the selling, so a dish without one looks unfinished.
     */
    photoId: varchar('photo_id', { length: 60 }),
    /** An id in public/img/plate — the transparent cut-outs. */
    plateId: varchar('plate_id', { length: 60 }),
    /** An id in public/img/scene, for dishes shown inside a photograph. */
    sceneId: varchar('scene_id', { length: 60 }),

    vegetarian: boolean('vegetarian').notNull().default(false),
    vegan: boolean('vegan').notNull().default(false),
    /** 0 = not spicy, 3 = the kitchen warns you. */
    spice: smallint('spice').notNull().default(0),
    /** EU allergen letters. An empty array means "not told", never "none". */
    allergens: jsonb('allergens').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    allergensConfirmed: boolean('allergens_confirmed').notNull().default(false),

    featured: boolean('featured').notNull().default(false),
    published: boolean('published').notNull().default(true),
    soldOut: boolean('sold_out').notNull().default(false),

    /**
     * The old website and the old PDF disagree on several prices. Where that is
     * the case the dish is published without an online price and the page says
     * why, rather than picking a number and hoping.
     */
    priceConfirmed: boolean('price_confirmed').notNull().default(false),
    sourceNote: text('source_note'),

    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('dishes_slug_key').on(table.slug),
    index('dishes_category_idx').on(table.categoryId, table.sort),
  ],
);

export const dishVariants = pgTable(
  'dish_variants',
  {
    id: serial('id').primaryKey(),
    dishId: integer('dish_id')
      .notNull()
      .references(() => dishes.id, { onDelete: 'cascade' }),
    labelDe: text('label_de').notNull(),
    labelEn: text('label_en'),
    labelVi: text('label_vi'),
    priceCents: integer('price_cents').notNull(),
    sort: integer('sort').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    /** Some dishes only work in the restaurant; those are never orderable. */
    orderable: boolean('orderable').notNull().default(true),
  },
  (table) => [index('dish_variants_dish_idx').on(table.dishId, table.sort)],
);

/* ------------------------------------------------------------- promotions -- */

export const promotions = pgTable(
  'promotions',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull(),
    titleDe: text('title_de').notNull(),
    titleEn: text('title_en'),
    titleVi: text('title_vi'),
    bodyDe: text('body_de'),
    bodyEn: text('body_en'),
    bodyVi: text('body_vi'),
    /**
     * The short word on the corner of the card — "Mo–Fr", "Donnerstags", a
     * season. It is a label, not a claim: no percentage, no crossed-out price,
     * because nothing on this card has been priced by the restaurant yet and a
     * discount nobody agreed to is the one decoration that can cost money.
     */
    badgeDe: varchar('badge_de', { length: 24 }),
    badgeEn: varchar('badge_en', { length: 24 }),
    badgeVi: varchar('badge_vi', { length: 24 }),

    /** Uploaded file under /uploads/promo — never an external URL. */
    imagePath: text('image_path'),
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    sort: integer('sort').notNull().default(0),
    published: boolean('published').notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('promotions_slug_key').on(table.slug)],
);

/* ---------------------------------------------------------------- reviews -- */

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  author: text('author').notNull(),
  rating: smallint('rating'),
  bodyDe: text('body_de'),
  bodyEn: text('body_en'),
  bodyVi: text('body_vi'),
  source: text('source'),
  sourceUrl: text('source_url'),
  /**
   * A guest quote may only be published once someone has confirmed we are
   * allowed to publish it. Unconfirmed rows stay invisible.
   */
  consentConfirmed: boolean('consent_confirmed').notNull().default(false),
  published: boolean('published').notNull().default(false),
  sort: integer('sort').notNull().default(0),
  createdAt: createdAt(),
});

/* ----------------------------------------------------------- reservations -- */

export const restaurantTables = pgTable('restaurant_tables', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull(),
  seatsMin: smallint('seats_min').notNull(),
  seatsMax: smallint('seats_max').notNull(),
  active: boolean('active').notNull().default(true),
  /**
   * The real floor plan has not been shared. These rows are a placeholder
   * capacity so availability is computed against something concrete rather
   * than invented per request — the admin replaces them before launch.
   */
  confirmed: boolean('confirmed').notNull().default(false),
});

/**
 * Where a booking came from.
 *
 * It matters for more than reporting. A booking made on Quandoo or TheFork was
 * already promised to the guest by that platform, so when it collides with one
 * of ours the external one keeps the table and ours is flagged for a human —
 * the guest on the other platform cannot be un-told.
 */
export const reservationChannels = ['direct', 'phone', 'walk_in', 'quandoo', 'thefork', 'import'] as const;
export type ReservationChannel = (typeof reservationChannels)[number];

export const reservationStatuses = [
  'requested',
  'confirmed',
  'seated',
  'completed',
  'cancelled_by_guest',
  'cancelled_by_restaurant',
  'no_show',
] as const;
export type ReservationStatus = (typeof reservationStatuses)[number];

export const reservations = pgTable(
  'reservations',
  {
    id: serial('id').primaryKey(),
    token: varchar('token', { length: 64 }).notNull(),
    reference: varchar('reference', { length: 16 }).notNull(),
    status: varchar('status', { length: 32 }).$type<ReservationStatus>().notNull().default('requested'),

    /** Local calendar date in Europe/Berlin, YYYY-MM-DD. */
    date: varchar('date', { length: 10 }).notNull(),
    /** Minutes past local midnight; may exceed 1440 for after-midnight seatings. */
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
    partySize: smallint('party_size').notNull(),
    tableId: integer('table_id').references(() => restaurantTables.id, { onDelete: 'set null' }),

    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    occasion: text('occasion'),
    /*
     * Where the guest would like to sit, if they said.
     *
     * A preference, not an allocation. The floor plan in this database is a
     * placeholder, so the booking engine cannot honestly promise a seat at the
     * bar; it records the wish and the staff honour it or explain why not. The
     * form says as much, because a request a guest believes is a guarantee is
     * worse than not asking.
     */
    seatingPreference: varchar('seating_preference', { length: 24 }),
    note: text('note'),
    /** Written by staff, never shown to the guest. */
    staffNote: text('staff_note'),
    locale: varchar('locale', { length: 2 }).notNull().default('de'),

    channel: varchar('channel', { length: 16 }).$type<ReservationChannel>().notNull().default('direct'),
    /** The id the other platform knows this booking by. Null for our own. */
    externalId: varchar('external_id', { length: 120 }),
    /** The last payload we received for it, kept for support calls. */
    externalPayload: jsonb('external_payload'),
    /**
     * Set when a booking arrived from a platform and could not be given a free
     * table. It is still recorded — the guest was told yes — but a human has to
     * resolve it.
     */
    conflict: boolean('conflict').notNull().default(false),

    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('reservations_token_key').on(table.token),
    uniqueIndex('reservations_reference_key').on(table.reference),
    index('reservations_day_idx').on(table.date, table.startMinute),
    // one row per booking per platform, so a replayed webhook updates instead
    // of duplicating
    uniqueIndex('reservations_external_key').on(table.channel, table.externalId),
  ],
);

/**
 * Every payload a booking platform has sent us, stored before it is
 * interpreted.
 *
 * An integration with someone else's system fails in ways you cannot reproduce
 * from your own logs. Keeping the raw body means a support call six weeks later
 * can be answered with what actually arrived, and a fixed parser can be replayed
 * over the same events instead of waiting for them to happen again.
 */
export const channelEvents = pgTable(
  'channel_events',
  {
    id: serial('id').primaryKey(),
    channel: varchar('channel', { length: 16 }).$type<ReservationChannel>().notNull(),
    /** The platform's own event id, when it sends one; used to drop replays. */
    externalEventId: varchar('external_event_id', { length: 120 }),
    kind: varchar('kind', { length: 40 }).notNull(),
    payload: jsonb('payload').notNull(),
    signatureOk: boolean('signature_ok').notNull().default(false),
    /** Null while unprocessed, then the outcome — including a refusal. */
    result: text('result'),
    reservationId: integer('reservation_id').references(() => reservations.id, { onDelete: 'set null' }),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('channel_events_recent_idx').on(table.channel, table.receivedAt),
    uniqueIndex('channel_events_external_key').on(table.channel, table.externalEventId),
  ],
);

/**
 * A short-lived claim on a time while the guest fills in their details.
 *
 * Without it, two people filling the same form at the same moment both reach
 * the end and one is told no. The hold is what makes the availability shown on
 * screen mean something.
 */
export const reservationHolds = pgTable(
  'reservation_holds',
  {
    id: serial('id').primaryKey(),
    token: varchar('token', { length: 64 }).notNull(),
    date: varchar('date', { length: 10 }).notNull(),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
    partySize: smallint('party_size').notNull(),
    tableId: integer('table_id').references(() => restaurantTables.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('reservation_holds_token_key').on(table.token),
    index('reservation_holds_day_idx').on(table.date, table.startMinute),
  ],
);

/* ------------------------------------------------------------------ cart -- */

export const carts = pgTable(
  'carts',
  {
    id: serial('id').primaryKey(),
    token: varchar('token', { length: 64 }).notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('carts_token_key').on(table.token)],
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: serial('id').primaryKey(),
    cartId: integer('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    dishId: integer('dish_id')
      .notNull()
      .references(() => dishes.id, { onDelete: 'cascade' }),
    variantId: integer('variant_id')
      .notNull()
      .references(() => dishVariants.id, { onDelete: 'cascade' }),
    quantity: smallint('quantity').notNull().default(1),
    note: text('note'),
    /**
     * What the price was when the guest added it. Never trusted for the total —
     * the server re-reads the live price at checkout — but it is what lets the
     * cart say "this price changed" instead of quietly charging more.
     */
    addedPriceCents: integer('added_price_cents').notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('cart_items_cart_idx').on(table.cartId)],
);

/* ---------------------------------------------------------------- orders -- */

export const orderStatuses = [
  'awaiting_payment',
  'placed',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'completed',
  'rejected',
  'cancelled',
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    token: varchar('token', { length: 64 }).notNull(),
    reference: varchar('reference', { length: 16 }).notNull(),
    status: varchar('status', { length: 32 }).$type<OrderStatus>().notNull().default('awaiting_payment'),
    fulfilment: varchar('fulfilment', { length: 10 }).$type<'pickup' | 'delivery'>().notNull(),

    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    street: text('street'),
    postalCode: varchar('postal_code', { length: 10 }),
    city: text('city'),
    addressNote: text('address_note'),
    locale: varchar('locale', { length: 2 }).notNull().default('de'),

    /** The promised slot, as a local date plus minutes past midnight. */
    slotDate: varchar('slot_date', { length: 10 }).notNull(),
    slotMinute: integer('slot_minute').notNull(),

    subtotalCents: integer('subtotal_cents').notNull(),
    deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull(),
    totalCents: integer('total_cents').notNull(),

    paymentProvider: varchar('payment_provider', { length: 24 }),
    paymentReference: text('payment_reference'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    /** Replaying the same submit must never create a second order. */
    idempotencyKey: varchar('idempotency_key', { length: 64 }),

    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('orders_token_key').on(table.token),
    uniqueIndex('orders_reference_key').on(table.reference),
    uniqueIndex('orders_idempotency_key').on(table.idempotencyKey),
    index('orders_slot_idx').on(table.slotDate, table.slotMinute),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    dishId: integer('dish_id').references(() => dishes.id, { onDelete: 'set null' }),
    variantId: integer('variant_id').references(() => dishVariants.id, { onDelete: 'set null' }),
    /** Copied, not joined: a receipt must not change when the menu does. */
    nameSnapshot: text('name_snapshot').notNull(),
    variantSnapshot: text('variant_snapshot'),
    quantity: smallint('quantity').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
    note: text('note'),
  },
  (table) => [index('order_items_order_idx').on(table.orderId)],
);

/* -------------------------------------------------------------- settings -- */

export const settings = pgTable('settings', {
  key: varchar('key', { length: 64 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------ rate limits -- */

export const rateLimits = pgTable(
  'rate_limits',
  {
    bucket: varchar('bucket', { length: 40 }).notNull(),
    subject: varchar('subject', { length: 120 }).notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.bucket, table.subject, table.windowStart] })],
);

/* ------------------------------------------------------------- relations -- */

export const categoriesRelations = relations(categories, ({ many }) => ({
  dishes: many(dishes),
}));

export const dishesRelations = relations(dishes, ({ one, many }) => ({
  category: one(categories, { fields: [dishes.categoryId], references: [categories.id] }),
  variants: many(dishVariants),
}));

export const dishVariantsRelations = relations(dishVariants, ({ one }) => ({
  dish: one(dishes, { fields: [dishVariants.dishId], references: [dishes.id] }),
}));

export const cartsRelations = relations(carts, ({ many }) => ({
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  dish: one(dishes, { fields: [cartItems.dishId], references: [dishes.id] }),
  variant: one(dishVariants, { fields: [cartItems.variantId], references: [dishVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
