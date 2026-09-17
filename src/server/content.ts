import 'server-only';

import { and, asc, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { promotions, reviews } from '@/db/schema';
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
  imagePath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

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
    imagePath: row.imagePath,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  }));
}

/** Everything, including drafts — for the upload screen. */
export async function listPromotions(locale: Locale) {
  const rows = await db.select().from(promotions).orderBy(asc(promotions.sort), desc(promotions.createdAt));
  return rows.map((row) => ({
    ...row,
    title: tr(locale, { de: row.titleDe, en: row.titleEn, vi: row.titleVi }),
  }));
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
  titleEn?: string | null;
  titleVi?: string | null;
  bodyDe?: string | null;
  bodyEn?: string | null;
  bodyVi?: string | null;
  imagePath?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  published: boolean;
}) {
  const [row] = await db
    .insert(promotions)
    .values(input)
    .onConflictDoUpdate({
      target: promotions.slug,
      set: {
        titleDe: input.titleDe,
        titleEn: input.titleEn ?? null,
        titleVi: input.titleVi ?? null,
        bodyDe: input.bodyDe ?? null,
        bodyEn: input.bodyEn ?? null,
        bodyVi: input.bodyVi ?? null,
        imagePath: input.imagePath ?? null,
        imageWidth: input.imageWidth ?? null,
        imageHeight: input.imageHeight ?? null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        published: input.published,
      },
    })
    .returning();
  return row;
}

export async function setPromotionPublished(id: number, published: boolean) {
  await db.update(promotions).set({ published }).where(eq(promotions.id, id));
}

export async function deletePromotion(id: number) {
  await db.delete(promotions).where(eq(promotions.id, id));
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
