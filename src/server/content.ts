import 'server-only';

import { and, asc, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { promotions, reviews , type PromoMedia } from '@/db/schema';
import { tr, type Locale } from '@/lib/i18n';

/**
 * The two pieces of content the restaurant maintains itself: what is running
 * this week, and what guests have said.
 */

export type Promotion = {
  id: number;
  slug: string;
  title: string;
  body: string | null;
  /** The short word on the corner of the card. Never a price or a percentage. */
  badge: string | null;
  /**
   * What the card shows, in order. Never empty when there is anything to show:
   * rows written before the card could hold more than one file are folded in
   * here as a single image, so nothing downstream has to know about both shapes.
   */
  media: PromoMedia[];
  imagePath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

/**
 * The card's media, whichever shape the row is in.
 *
 * Rows written before an offer could hold more than one file carry a single
 * `imagePath` and nothing in `media`. Folding them together here means every
 * screen reads one list and nobody downstream has to remember the old shape.
 */
function mediaOf(row: { media: PromoMedia[] | null; imagePath: string | null; imageWidth: number | null; imageHeight: number | null }): PromoMedia[] {
  if (row.media?.length) return row.media;
  if (!row.imagePath) return [];
  return [{ path: row.imagePath, kind: 'image', width: row.imageWidth, height: row.imageHeight }];
}

/** Only what is published and inside its own dates. An expired offer is a lie. */
export async function getLivePromotions(locale: Locale): Promise<Promotion[]> {
  const now = new Date();
  const rows = await db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.published, true),
        or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
        or(isNull(promotions.endsAt), gt(promotions.endsAt, now)),
      ),
    )
    .orderBy(asc(promotions.sort), desc(promotions.createdAt));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: tr(locale, { de: row.titleDe, en: row.titleEn, vi: row.titleVi }),
    body: tr(locale, { de: row.bodyDe, en: row.bodyEn, vi: row.bodyVi }) || null,
    badge: tr(locale, { de: row.badgeDe, en: row.badgeEn, vi: row.badgeVi }) || null,
    media: mediaOf(row),
    imagePath: row.imagePath,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  }));
}

/** Everything, including drafts — for the back office. */
export async function listPromotions(locale: Locale) {
  const rows = await db.select().from(promotions).orderBy(asc(promotions.sort), desc(promotions.createdAt));
  return rows.map((row) => ({
    ...row,
    // Folded, like everywhere else, so the editor shows an older row's single
    // picture as the first item of its list instead of as nothing at all.
    media: mediaOf(row),
    title: tr(locale, { de: row.titleDe, en: row.titleEn, vi: row.titleVi }),
  }));
}

/**
 * What this offer already has on file.
 *
 * The editor sends back the paths it wants to keep, and a path arriving from a
 * browser is a claim, not a fact. Without checking them against the row, the
 * form could be talked into pointing an offer at any file on the server — so
 * only paths this row already holds survive the round trip.
 */
export async function getPromotionMedia(id: number): Promise<PromoMedia[]> {
  const [row] = await db.select().from(promotions).where(eq(promotions.id, id)).limit(1);
  return row ? mediaOf(row) : [];
}

export type Review = {
  id: number;
  author: string;
  rating: number | null;
  body: string;
  source: string | null;
  sourceUrl: string | null;
};

/**
 * Guest quotes.
 *
 * Two gates, not one: published *and* consent confirmed. Quoting a real person
 * on a commercial page without their agreement is not ours to decide.
 */
export async function getReviews(locale: Locale, limit = 6): Promise<Review[]> {
  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.published, true), eq(reviews.consentConfirmed, true)))
    .orderBy(asc(reviews.sort), desc(reviews.createdAt))
    .limit(limit);

  return rows
    .map((row) => ({
      id: row.id,
      author: row.author,
      rating: row.rating,
      body: tr(locale, { de: row.bodyDe, en: row.bodyEn, vi: row.bodyVi }),
      source: row.source,
      sourceUrl: row.sourceUrl,
    }))
    .filter((review) => review.body.length > 0);
}

export async function createPromotion(input: {
  slug: string;
  titleDe: string;
  badgeDe?: string | null;
  badgeEn?: string | null;
  badgeVi?: string | null;
  titleEn?: string | null;
  titleVi?: string | null;
  bodyDe?: string | null;
  bodyEn?: string | null;
  bodyVi?: string | null;
  media?: PromoMedia[];
  imagePath?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  sort?: number;
  published: boolean;
}) {
  const [row] = await db
    .insert(promotions)
    .values(input)
    .onConflictDoUpdate({
      target: promotions.slug,
      set: {
        titleDe: input.titleDe,
        badgeDe: input.badgeDe?.trim().slice(0, 24) || null,
        badgeEn: input.badgeEn?.trim().slice(0, 24) || null,
        badgeVi: input.badgeVi?.trim().slice(0, 24) || null,
        titleEn: input.titleEn ?? null,
        titleVi: input.titleVi ?? null,
        bodyDe: input.bodyDe ?? null,
        bodyEn: input.bodyEn ?? null,
        bodyVi: input.bodyVi ?? null,
        media: input.media ?? [],
        imagePath: input.imagePath ?? null,
        imageWidth: input.imageWidth ?? null,
        imageHeight: input.imageHeight ?? null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        sort: input.sort ?? 0,
        published: input.published,
      },
    })
    .returning();
  return row;
}

/**
 * Editing an offer that already exists.
 *
 * The slug is not touched. It is what the row has been known by since it was
 * created, and renaming an offer is not a reason to change its identity.
 *
 * `media` and the three legacy image columns are optional together: leaving
 * them out means "keep what is there", so a caller that only has text to change
 * cannot silently blank the pictures.
 */
export async function updatePromotion(
  id: number,
  input: {
    titleDe: string;
    titleEn: string | null;
    titleVi: string | null;
    bodyDe: string | null;
    bodyEn: string | null;
    bodyVi: string | null;
    media?: PromoMedia[];
    imagePath?: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
    startsAt: Date | null;
    endsAt: Date | null;
    sort: number;
    published: boolean;
  },
) {
  await db.update(promotions).set(input).where(eq(promotions.id, id));
}

export async function setPromotionPublished(id: number, published: boolean) {
  await db.update(promotions).set({ published }).where(eq(promotions.id, id));
}

export async function deletePromotion(id: number) {
  await db.delete(promotions).where(eq(promotions.id, id));
}

/**
 * Moving one offer up or down the running order.
 *
 * Every row is renumbered rather than two `sort` values being swapped: rows
 * created through the form all start at the same number, and where they tie the
 * order is decided by `createdAt` — so a swap of two equal values would move
 * nothing and look like a broken button. Renumbering the list makes the order
 * on screen the order in the column.
 */
export async function reorderPromotion(id: number, direction: -1 | 1) {
  await db.transaction(async (tx) => {
    // Only `tx` inside here. Reaching for the outer handle deadlocks PGlite
    // with no error at all.
    const rows = await tx
      .select({ id: promotions.id })
      .from(promotions)
      .orderBy(asc(promotions.sort), desc(promotions.createdAt));

    const from = rows.findIndex((row) => row.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= rows.length) return;

    const order = rows.map((row) => row.id);
    [order[from], order[to]] = [order[to], order[from]];

    for (const [position, rowId] of order.entries()) {
      await tx.update(promotions).set({ sort: position }).where(eq(promotions.id, rowId));
    }
  });
}

/** A slug that is unique even when two offers share a title. */
export function slugify(value: string): string {
  const base = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return base || 'aktion';
}

export async function uniqueSlug(base: string): Promise<string> {
  const rows = await db
    .select({ slug: promotions.slug })
    .from(promotions)
    .where(sql`${promotions.slug} = ${base} or ${promotions.slug} like ${`${base}-%`}`);
  if (!rows.some((row) => row.slug === base)) return base;
  for (let n = 2; n < 500; n += 1) {
    const candidate = `${base}-${n}`;
    if (!rows.some((row) => row.slug === candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}
