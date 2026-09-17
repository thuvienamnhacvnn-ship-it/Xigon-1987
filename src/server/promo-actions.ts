'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createPromotion,
  deletePromotion,
  reorderPromotion,
  setPromotionPublished,
  slugify,
  uniqueSlug,
  updatePromotion,
} from './content';
import { storePromoImage, type StoredImage } from './uploads';
import { isSignedIn } from './admin-auth';
import { RESTAURANT } from '@/lib/restaurant';
import { hrefFor, locales } from '@/lib/i18n';

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

export type PromoState =
  | { status: 'idle' }
  | { status: 'saved'; title: string }
  | { status: 'error'; message: 'forbidden' | 'invalid' | 'dates' | 'type' | 'size' | 'unreadable' };

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

  let image: StoredImage | null = null;
  const file = formData.get('image');
  if (file instanceof File && file.size > 0) {
    const stored = await storePromoImage(file);
    if (!stored.ok) return { status: 'error', message: stored.reason };
    image = stored.image;
  }

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

  const picture = image
    ? { imagePath: image.path, imageWidth: image.width, imageHeight: image.height }
    : {};

  if (parsed.data.id) {
    // Spread only when a file was actually chosen — see `updatePromotion`.
    await updatePromotion(parsed.data.id, { ...text, ...picture });
  } else {
    await createPromotion({
      slug: await uniqueSlug(slugify(parsed.data.titleDe)),
      ...text,
      imagePath: image?.path ?? null,
      imageWidth: image?.width ?? null,
      imageHeight: image?.height ?? null,
    });
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
