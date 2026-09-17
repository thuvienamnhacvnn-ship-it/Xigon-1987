'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createPromotion, deletePromotion, setPromotionPublished, slugify, uniqueSlug } from './content';
import { storePromoImage } from './uploads';
import { hrefFor, locales } from '@/lib/i18n';

/**
 * The promotions screen.
 *
 * An upload endpoint with no lock on it is a liability, so writes are refused
 * unless one of two things is true: the request came from this machine, or
 * `XIGON_ADMIN_PASSWORD` is set and was sent with the form. The page itself
 * says which of the two is in force, so nobody deploys this believing it is
 * protected when it is not.
 */
async function authorised(password: string | null): Promise<boolean> {
  const expected = process.env.XIGON_ADMIN_PASSWORD;
  if (expected) return Boolean(password) && password === expected;

  const host = (await headers()).get('host') ?? '';
  const name = host.split(':')[0];
  return name === 'localhost' || name === '127.0.0.1' || name === '[::1]';
}

export async function adminIsOpen(): Promise<{ open: boolean; needsPassword: boolean }> {
  const needsPassword = Boolean(process.env.XIGON_ADMIN_PASSWORD);
  return { open: needsPassword ? false : await authorised(null), needsPassword };
}

const promoSchema = z.object({
  titleDe: z.string().trim().min(2).max(120),
  titleEn: z.string().trim().max(120).optional(),
  titleVi: z.string().trim().max(120).optional(),
  bodyDe: z.string().trim().max(1200).optional(),
  bodyEn: z.string().trim().max(1200).optional(),
  bodyVi: z.string().trim().max(1200).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  published: z.boolean(),
});

export type PromoState =
  | { status: 'idle' }
  | { status: 'saved'; title: string }
  | { status: 'error'; message: 'forbidden' | 'invalid' | 'type' | 'size' | 'unreadable' };

export async function savePromotionAction(_previous: PromoState, formData: FormData): Promise<PromoState> {
  const password = (formData.get('password') as string | null)?.trim() || null;
  if (!(await authorised(password))) return { status: 'error', message: 'forbidden' };

  const parsed = promoSchema.safeParse({
    titleDe: formData.get('titleDe'),
    titleEn: (formData.get('titleEn') as string) || undefined,
    titleVi: (formData.get('titleVi') as string) || undefined,
    bodyDe: (formData.get('bodyDe') as string) || undefined,
    bodyEn: (formData.get('bodyEn') as string) || undefined,
    bodyVi: (formData.get('bodyVi') as string) || undefined,
    startsAt: (formData.get('startsAt') as string) || undefined,
    endsAt: (formData.get('endsAt') as string) || undefined,
    published: formData.get('published') === 'on',
  });
  if (!parsed.success) return { status: 'error', message: 'invalid' };

  let imagePath: string | null = null;
  let imageWidth: number | null = null;
  let imageHeight: number | null = null;

  const file = formData.get('image');
  if (file instanceof File && file.size > 0) {
    const stored = await storePromoImage(file);
    if (!stored.ok) return { status: 'error', message: stored.reason };
    imagePath = stored.image.path;
    imageWidth = stored.image.width;
    imageHeight = stored.image.height;
  }

  const slug = await uniqueSlug(slugify(parsed.data.titleDe));

  await createPromotion({
    slug,
    titleDe: parsed.data.titleDe,
    titleEn: parsed.data.titleEn ?? null,
    titleVi: parsed.data.titleVi ?? null,
    bodyDe: parsed.data.bodyDe ?? null,
    bodyEn: parsed.data.bodyEn ?? null,
    bodyVi: parsed.data.bodyVi ?? null,
    imagePath,
    imageWidth,
    imageHeight,
    startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    published: parsed.data.published,
  });

  for (const locale of locales) {
    revalidatePath(hrefFor(locale, 'home'));
    revalidatePath(hrefFor(locale, 'promoAdmin'));
  }

  return { status: 'saved', title: parsed.data.titleDe };
}

export async function togglePromotionAction(formData: FormData): Promise<void> {
  const password = (formData.get('password') as string | null)?.trim() || null;
  if (!(await authorised(password))) return;

  const id = Number(formData.get('id'));
  if (!Number.isFinite(id)) return;

  await setPromotionPublished(id, formData.get('published') === 'true');
  for (const locale of locales) {
    revalidatePath(hrefFor(locale, 'home'));
    revalidatePath(hrefFor(locale, 'promoAdmin'));
  }
}

export async function deletePromotionAction(formData: FormData): Promise<void> {
  const password = (formData.get('password') as string | null)?.trim() || null;
  if (!(await authorised(password))) return;

  const id = Number(formData.get('id'));
  if (!Number.isFinite(id)) return;

  await deletePromotion(id);
  for (const locale of locales) {
    revalidatePath(hrefFor(locale, 'home'));
    revalidatePath(hrefFor(locale, 'promoAdmin'));
  }
}
