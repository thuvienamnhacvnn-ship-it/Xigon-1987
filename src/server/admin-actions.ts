'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin, signIn, signOut } from './admin-auth';
import { assignTable, createByStaff, setStaffNote, setStatus } from './admin';
import { markPaid, setOrderStatus } from './admin-orders';
import { orderStatuses, reservationStatuses } from '@/db/schema';
import { hrefFor, locales, type Locale } from '@/lib/i18n';

/**
 * Everything the back office can change.
 *
 * Every action starts with `requireAdmin`, which throws. A guard that returns a
 * boolean is a guard somebody forgets to read.
 */

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const localeSchema = z.enum(locales);

function bookPath(locale: Locale, date: string) {
  return `${hrefFor(locale, 'admin')}/reservierungen?date=${date}`;
}

/* ------------------------------------------------------------------ auth -- */

export type SignInState = { status: 'idle' | 'wrong' | 'not_configured' | 'rate_limited' };

export async function signInAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const password = String(formData.get('password') ?? '');
  const result = await signIn(password);
  if (result === 'ok') {
    for (const locale of locales) revalidatePath(hrefFor(locale, 'admin'));
    return { status: 'idle' };
  }
  return { status: result };
}

export async function signOutAction(): Promise<void> {
  await signOut();
  for (const locale of locales) revalidatePath(hrefFor(locale, 'admin'));
}

/* ------------------------------------------------------------ the book --- */

const statusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(reservationStatuses),
  date: dateSchema,
  locale: localeSchema,
});

export async function setStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = statusSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
    date: formData.get('date'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return;

  await setStatus(parsed.data.id, parsed.data.status);
  revalidatePath(bookPath(parsed.data.locale, parsed.data.date));
}

const assignSchema = z.object({
  id: z.coerce.number().int().positive(),
  tableId: z.coerce.number().int().nonnegative(),
  date: dateSchema,
  locale: localeSchema,
});

export type AssignState = { status: 'idle' | 'taken' | 'not_found' | 'invalid' };

export async function assignTableAction(_previous: AssignState, formData: FormData): Promise<AssignState> {
  await requireAdmin();
  const parsed = assignSchema.safeParse({
    id: formData.get('id'),
    tableId: formData.get('tableId'),
    date: formData.get('date'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return { status: 'invalid' };

  // Zero is the "no table" option in the select; it is not a table id.
  const result = await assignTable(parsed.data.id, parsed.data.tableId === 0 ? null : parsed.data.tableId);
  revalidatePath(bookPath(parsed.data.locale, parsed.data.date));
  return result.ok ? { status: 'idle' } : { status: result.reason };
}

export async function setStaffNoteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const date = String(formData.get('date') ?? '');
  const locale = localeSchema.safeParse(formData.get('locale'));
  if (!Number.isFinite(id) || !dateSchema.safeParse(date).success || !locale.success) return;

  await setStaffNote(id, String(formData.get('staffNote') ?? ''));
  revalidatePath(bookPath(locale.data, date));
}

const staffBookingSchema = z.object({
  date: dateSchema,
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  partySize: z.coerce.number().int().min(1).max(40),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(3).max(40),
  email: z.string().trim().max(160).optional(),
  note: z.string().trim().max(500).optional(),
  channel: z.enum(['phone', 'walk_in']),
  locale: localeSchema,
});

export type StaffBookingState =
  | { status: 'idle' }
  | { status: 'saved'; reference: string; seated: boolean }
  | { status: 'invalid'; field?: string };

export async function createBookingAction(
  _previous: StaffBookingState,
  formData: FormData,
): Promise<StaffBookingState> {
  await requireAdmin();
  const parsed = staffBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: 'invalid', field: parsed.error.issues[0]?.path.join('.') };
  }

  const result = await createByStaff(parsed.data);
  revalidatePath(bookPath(parsed.data.locale, parsed.data.date));

  return result.ok
    ? { status: 'saved', reference: result.reference, seated: result.tableId !== null }
    : { status: 'invalid' };
}

/* --------------------------------------------------------------- orders --- */

function ordersPath(locale: Locale, date: string) {
  return `${hrefFor(locale, 'admin')}/bestellungen?date=${date}`;
}

const orderStatusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(orderStatuses),
  date: dateSchema,
  locale: localeSchema,
});

export async function setOrderStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = orderStatusSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
    date: formData.get('date'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return;

  await setOrderStatus(parsed.data.id, parsed.data.status);
  revalidatePath(ordersPath(parsed.data.locale, parsed.data.date));
  revalidatePath(`${hrefFor(parsed.data.locale, 'admin')}/zahlungen`);
}

const markPaidSchema = z.object({
  id: z.coerce.number().int().positive(),
  reference: z.string().trim().max(120).optional().nullable(),
  date: dateSchema,
  locale: localeSchema,
});

/**
 * Writes down that the money arrived.
 *
 * Deliberately not called `pay`. Nothing in this system can take a payment —
 * no provider is connected — and a button named for something it does not do is
 * how a member of staff ends up believing a card was charged. What it records
 * is a person at the counter saying they saw it happen.
 */
export async function markOrderPaidAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = markPaidSchema.safeParse({
    id: formData.get('id'),
    reference: formData.get('reference'),
    date: formData.get('date'),
    locale: formData.get('locale'),
  });
  if (!parsed.success) return;

  await markPaid(parsed.data.id, parsed.data.reference ?? null);
  revalidatePath(ordersPath(parsed.data.locale, parsed.data.date));
  revalidatePath(`${hrefFor(parsed.data.locale, 'admin')}/zahlungen`);
}
