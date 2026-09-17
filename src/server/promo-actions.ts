'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createPromotion,
  deletePromotion,
  getPromotionMedia,
  reorderPromotion,
  setPromotionPublished,
  slugify,
  uniqueSlug,
  updatePromotion,
} from './content';
import { storePromoMedia, type UploadError } from './uploads';
import { isSignedIn } from './admin-auth';
import { RESTAURANT } from '@/lib/restaurant';
import { MEDIA_MAX_ITEMS } from '@/lib/media-limits';
import { hrefFor, locales } from '@/lib/i18n';
import type { PromoMedia } from '@/db/schema';

/**
 * Everything the back office can change about the offers.
 *
 * These write to the public site, so each one begins with `isSignedIn()` — the
 * back-office session and nothing else. No hidden password field, no "we are on
 * localhost so it must be us": those were how the standalone upload screen let
 * itself in, and there is now one gate for the whole back office.
 */

const idSchema = z.coerce.number().int().positive();

const promoSchema = z.object({
  /** Absent for a new offer, present when an existing one is being edited. */
  id: idSchema.optional(),
  titleDe: z.string().trim().min(2).max(120),
  titleEn: z.string().trim().max(120).optional(),
  titleVi: z.string().trim().max(120).optional(),
  bodyDe: z.string().trim().max(1200).optional(),
  bodyEn: z.string().trim().max(1200).optional(),
  bodyVi: z.string().trim().max(1200).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  sort: z.coerce.number().int().min(0).max(9999),
  published: z.boolean(),
});

export type PromoError = 'forbidden' | 'invalid' | 'dates' | 'too-many' | UploadError;

export type PromoState =
  | { status: 'idle' }
  | { status: 'saved'; title: string }
  | { status: 'error'; message: PromoError };

/**
 * The running order the editor sends back.
 *
 * Each entry is either a file already on this offer, named by its path, or one
 * of the files posted alongside, named by its position in that list. Saying it
 * this way means the order on the card is the order on the screen without the
 * browser having to re-upload pictures that have not changed.
 */
const orderSchema = z
  .array(
    z.union([
      z.object({ keep: z.string().max(300) }),
      z.object({
        slot: z.number().int().min(0).max(63),
        /** The still to show while a clip loads, if the browser could make one. */
        poster: z.number().int().min(0).max(63).optional(),
      }),
    ]),
  )
  .max(MEDIA_MAX_ITEMS * 2);

/**
 * Turns that order into the list the card will read.
 *
 * Everything the browser sent is treated as a request, not an instruction: a
 * path is only kept if the offer already has it, and a file is only kept if its
 * own bytes say it is something we accept.
 */
async function collectMedia(
  formData: FormData,
  id: number | null,
): Promise<{ ok: true; items: PromoMedia[] } | { ok: false; reason: PromoError }> {
  const raw = formData.get('mediaOrder');
  if (typeof raw !== 'string' || !raw) return { ok: true, items: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  const order = orderSchema.safeParse(parsed);
  if (!order.success) return { ok: false, reason: 'invalid' };

  /*
   * Filtered on the name, not the size. A file input with nothing in it still
   * posts one empty, nameless part, and dropping entries by size would shift
   * every slot number after a zero-byte file — quietly attaching the wrong
   * picture. An empty file that really was chosen is refused further down.
   */
  const files = formData.getAll('mediaFiles').filter((entry): entry is File => entry instanceof File && entry.name !== '');
  const existing = id ? await getPromotionMedia(id) : [];
  const items: PromoMedia[] = [];

  for (const entry of order.data) {
    if (items.length >= MEDIA_MAX_ITEMS) return { ok: false, reason: 'too-many' };

    if ('keep' in entry) {
      /*
       * A path that is no longer on the row is dropped rather than refused.
       * Two tabs open on the same offer is an ordinary mistake, and losing the
       * whole edit over it would be a worse answer than saving what is true.
       */
      const held = existing.find((media) => media.path === entry.keep);
      if (held) items.push(held);
      continue;
    }

    const file = files[entry.slot];
    if (!file) return { ok: false, reason: 'invalid' };

    const stored = await storePromoMedia(file);
    if (!stored.ok) return { ok: false, reason: stored.reason };

    const item = stored.item;
    if (item.kind === 'video' && entry.poster !== undefined) {
      const still = files[entry.poster];
      const poster = still ? await storePromoMedia(still, 'image') : null;
      /*
       * A poster is a nicety. If the frame did not survive the trip the clip is
       * still worth publishing, and `OfferMedia` copes with a missing one.
       */
      if (poster?.ok) item.poster = poster.item.path;
    }
    items.push(item);
  }

  return { ok: true, items };
}

/**
 * The still image an older reader will find in `imagePath`.
 *
 * The first item, unless the first item is a clip: that column is read as a
 * picture by anything written before an offer could hold more than one file,
 * and handing those readers a video URL would show a guest a broken image. A
 * clip's poster frame is the honest substitute, and null is better than either.
 */
function legacyStill(items: PromoMedia[]): PromoMedia | null {
  const picture = items.find((item) => item.kind === 'image');
  if (picture) return picture;

  const poster = items.find((item) => item.kind === 'video' && item.poster)?.poster;
  return poster ? { path: poster, kind: 'image', width: null, height: null } : null;
}

/**
 * A `datetime-local` value is a wall clock with no timezone on it, and the
 * person typing it means Berlin. Handing it to `new Date()` would mean whatever
 * zone the server happens to run in — which on a UTC host ends the offer two
 * hours after the evening it was meant to cover.
 */
function berlinInstant(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);

  const wall = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes, because the offset itself depends on the instant: the first
  // lands within an hour, the second settles the two nights a year when the
  // clocks move.
  let instant = wall - offsetAt(wall);
  instant = wall - offsetAt(instant);
  return new Date(instant);
}

const BERLIN_WALL = new Intl.DateTimeFormat('sv-SE', {
  timeZone: RESTAURANT.timezone,
  dateStyle: 'short',
  timeStyle: 'medium',
});

/** How far ahead of UTC the restaurant's clock is at a given instant. */
function offsetAt(instant: number): number {
  const reading = BERLIN_WALL.format(new Date(instant)).replace(' ', 'T');
  return Date.parse(`${reading}Z`) - instant;
}

/**
 * Where an offer shows up. The home page carries the current one, the offers
 * page carries all of them, and the back-office list has to reflect the change
 * the moment it is made.
 */
function revalidateOffers() {
  for (const locale of locales) {
    revalidatePath(hrefFor(locale, 'home'));
    revalidatePath(hrefFor(locale, 'offers'));
    revalidatePath(`${hrefFor(locale, 'admin')}/aktionen`);
  }
}

export async function savePromotionAction(_previous: PromoState, formData: FormData): Promise<PromoState> {
  if (!(await isSignedIn())) return { status: 'error', message: 'forbidden' };

  const parsed = promoSchema.safeParse({
    id: (formData.get('id') as string) || undefined,
    titleDe: formData.get('titleDe'),
    titleEn: (formData.get('titleEn') as string) || undefined,
    titleVi: (formData.get('titleVi') as string) || undefined,
    bodyDe: (formData.get('bodyDe') as string) || undefined,
    bodyEn: (formData.get('bodyEn') as string) || undefined,
    bodyVi: (formData.get('bodyVi') as string) || undefined,
    startsAt: (formData.get('startsAt') as string) || undefined,
    endsAt: (formData.get('endsAt') as string) || undefined,
    sort: (formData.get('sort') as string) || 0,
    published: formData.get('published') === 'on',
  });
  if (!parsed.success) return { status: 'error', message: 'invalid' };

  const startsAt = parsed.data.startsAt ? berlinInstant(parsed.data.startsAt) : null;
  const endsAt = parsed.data.endsAt ? berlinInstant(parsed.data.endsAt) : null;
  if (parsed.data.startsAt && !startsAt) return { status: 'error', message: 'invalid' };
  if (parsed.data.endsAt && !endsAt) return { status: 'error', message: 'invalid' };
  // An offer that ends before it starts is never live, and nobody means that.
  if (startsAt && endsAt && endsAt <= startsAt) return { status: 'error', message: 'dates' };

  const media = await collectMedia(formData, parsed.data.id ?? null);
  if (!media.ok) return { status: 'error', message: media.reason };
  const still = legacyStill(media.items);

  const text = {
    titleDe: parsed.data.titleDe,
    titleEn: parsed.data.titleEn ?? null,
    titleVi: parsed.data.titleVi ?? null,
    bodyDe: parsed.data.bodyDe ?? null,
    bodyEn: parsed.data.bodyEn ?? null,
    bodyVi: parsed.data.bodyVi ?? null,
    startsAt,
    endsAt,
    sort: parsed.data.sort,
    published: parsed.data.published,
  };

  /*
   * Always written, both of them. The editor posts the whole running order on
   * every save, so "no items" means the pictures were taken away on purpose —
   * and leaving `imagePath` behind would put one of them back on the card.
   */
  const pictures = {
    media: media.items,
    imagePath: still?.path ?? null,
    imageWidth: still?.width ?? null,
    imageHeight: still?.height ?? null,
  };

  if (parsed.data.id) {
    await updatePromotion(parsed.data.id, { ...text, ...pictures });
  } else {
    await createPromotion({ slug: await uniqueSlug(slugify(parsed.data.titleDe)), ...text, ...pictures });
  }

  revalidateOffers();
  return { status: 'saved', title: parsed.data.titleDe };
}

export async function togglePromotionAction(formData: FormData): Promise<void> {
  if (!(await isSignedIn())) return;

  const id = idSchema.safeParse(formData.get('id'));
  if (!id.success) return;

  await setPromotionPublished(id.data, formData.get('published') === 'true');
  revalidateOffers();
}

export async function deletePromotionAction(formData: FormData): Promise<void> {
  if (!(await isSignedIn())) return;

  const id = idSchema.safeParse(formData.get('id'));
  if (!id.success) return;

  await deletePromotion(id.data);
  revalidateOffers();
}

export async function reorderPromotionAction(formData: FormData): Promise<void> {
  if (!(await isSignedIn())) return;

  const id = idSchema.safeParse(formData.get('id'));
  const direction = formData.get('direction');
  if (!id.success || (direction !== 'up' && direction !== 'down')) return;

  await reorderPromotion(id.data, direction === 'up' ? -1 : 1);
  revalidateOffers();
}
