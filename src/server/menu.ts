import 'server-only';

import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, dishVariants, dishes } from '@/db/schema';
import { tr, type Locale } from '@/lib/i18n';

/**
 * Reading the menu.
 *
 * Every function here returns rows already flattened into the reader's
 * language, so no component has to know that the database keeps three columns
 * per string. Unpublished rows never leave this file.
 */

export type MenuVariant = {
  id: number;
  label: string;
  priceCents: number;
  isDefault: boolean;
  orderable: boolean;
};

export type MenuDish = {
  id: number;
  slug: string;
  code: string | null;
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  photoId: string | null;
  plateId: string | null;
  sceneId: string | null;
  vegetarian: boolean;
  vegan: boolean;
  spice: number;
  allergens: string[];
  allergensConfirmed: boolean;
  featured: boolean;
  soldOut: boolean;
  priceConfirmed: boolean;
  sourceNote: string | null;
  variants: MenuVariant[];
  /** Cheapest published price, or null when no price is confirmed. */
  fromCents: number | null;
};

export type MenuCategory = {
  id: number;
  slug: string;
  name: string;
  note: string | null;
  dishes: MenuDish[];
};

type DishRow = typeof dishes.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;
type VariantRow = typeof dishVariants.$inferSelect;

function toDish(locale: Locale, dish: DishRow, category: CategoryRow, variants: VariantRow[]): MenuDish {
  const mapped = variants
    .sort((a, b) => a.sort - b.sort)
    .map((variant) => ({
      id: variant.id,
      label: tr(locale, { de: variant.labelDe, en: variant.labelEn, vi: variant.labelVi }),
      priceCents: variant.priceCents,
      isDefault: variant.isDefault,
      orderable: variant.orderable,
    }));

  return {
    id: dish.id,
    slug: dish.slug,
    code: dish.code,
    categoryId: category.id,
    categorySlug: category.slug,
    categoryName: tr(locale, { de: category.nameDe, en: category.nameEn, vi: category.nameVi }),
    name: tr(locale, { de: dish.nameDe, en: dish.nameEn, vi: dish.nameVi }),
    description: tr(locale, { de: dish.descriptionDe, en: dish.descriptionEn, vi: dish.descriptionVi }) || null,
    ingredients: tr(locale, { de: dish.ingredientsDe, en: dish.ingredientsEn, vi: dish.ingredientsVi }) || null,
    photoId: dish.photoId,
    plateId: dish.plateId,
    sceneId: dish.sceneId,
    vegetarian: dish.vegetarian,
    vegan: dish.vegan,
    spice: dish.spice,
    allergens: dish.allergens ?? [],
    allergensConfirmed: dish.allergensConfirmed,
    featured: dish.featured,
    soldOut: dish.soldOut,
    priceConfirmed: dish.priceConfirmed,
    sourceNote: dish.sourceNote,
    variants: mapped,
    fromCents: mapped.length ? Math.min(...mapped.map((v) => v.priceCents)) : null,
  };
}

/** The whole published card, grouped, in menu order. */
export async function getMenu(locale: Locale): Promise<MenuCategory[]> {
  const rows = await db
    .select({ dish: dishes, category: categories, variant: dishVariants })
    .from(dishes)
    .innerJoin(categories, eq(dishes.categoryId, categories.id))
    .leftJoin(dishVariants, eq(dishVariants.dishId, dishes.id))
    .where(and(eq(dishes.published, true), eq(categories.published, true)))
    .orderBy(asc(categories.sort), asc(dishes.sort), asc(dishes.id));

  const byCategory = new Map<number, MenuCategory>();
  const variantsByDish = new Map<number, VariantRow[]>();
  const dishRows = new Map<number, { dish: DishRow; category: CategoryRow }>();
  const order: number[] = [];

  for (const row of rows) {
    if (!dishRows.has(row.dish.id)) {
      dishRows.set(row.dish.id, { dish: row.dish, category: row.category });
      order.push(row.dish.id);
    }
    if (row.variant) {
      const list = variantsByDish.get(row.dish.id) ?? [];
      if (!list.some((v) => v.id === row.variant!.id)) list.push(row.variant);
      variantsByDish.set(row.dish.id, list);
    }
  }

  for (const dishId of order) {
    const entry = dishRows.get(dishId)!;
    const category = entry.category;

    let bucket = byCategory.get(category.id);
    if (!bucket) {
      bucket = {
        id: category.id,
        slug: category.slug,
        name: tr(locale, { de: category.nameDe, en: category.nameEn, vi: category.nameVi }),
        note: tr(locale, { de: category.noteDe, en: category.noteEn, vi: category.noteVi }) || null,
        dishes: [],
      };
      byCategory.set(category.id, bucket);
    }

    bucket.dishes.push(toDish(locale, entry.dish, category, variantsByDish.get(dishId) ?? []));
  }

  return [...byCategory.values()];
}

/** The handful the house puts forward, for the home page. */
export async function getFeatured(locale: Locale, limit = 4): Promise<MenuDish[]> {
  const menu = await getMenu(locale);
  return menu
    .flatMap((category) => category.dishes)
    .filter((dish) => dish.featured)
    .slice(0, limit);
}

export async function getDish(locale: Locale, slug: string): Promise<MenuDish | null> {
  const rows = await db
    .select({ dish: dishes, category: categories, variant: dishVariants })
    .from(dishes)
    .innerJoin(categories, eq(dishes.categoryId, categories.id))
    .leftJoin(dishVariants, eq(dishVariants.dishId, dishes.id))
    .where(and(eq(dishes.slug, slug), eq(dishes.published, true)))
    .orderBy(asc(dishVariants.sort));

  if (!rows.length) return null;

  const variants = rows.map((row) => row.variant).filter((variant): variant is VariantRow => Boolean(variant));
  return toDish(locale, rows[0].dish, rows[0].category, variants);
}

/** Other dishes from the same part of the card. */
export async function getRelated(locale: Locale, dish: MenuDish, limit = 3): Promise<MenuDish[]> {
  const menu = await getMenu(locale);
  const category = menu.find((entry) => entry.id === dish.categoryId);
  const pool = (category?.dishes ?? []).filter((entry) => entry.id !== dish.id);
  if (pool.length >= limit) return pool.slice(0, limit);

  const rest = menu.flatMap((entry) => entry.dishes).filter((entry) => entry.id !== dish.id && !pool.includes(entry));
  return [...pool, ...rest].slice(0, limit);
}

/** Every published dish, flat — what the menu guide is allowed to talk about. */
export async function getCatalogue(locale: Locale): Promise<MenuDish[]> {
  return (await getMenu(locale)).flatMap((category) => category.dishes);
}

/**
 * The live price for a variant.
 *
 * Called on every cart change and again at checkout: the client is never the
 * source of a price.
 */
export async function priceFor(dishId: number, variantId: number) {
  const [row] = await db
    .select({ dish: dishes, variant: dishVariants })
    .from(dishVariants)
    .innerJoin(dishes, eq(dishVariants.dishId, dishes.id))
    .where(and(eq(dishVariants.id, variantId), eq(dishVariants.dishId, dishId)))
    .limit(1);

  if (!row || !row.dish.published) return null;
  return {
    priceCents: row.variant.priceCents,
    orderable: row.variant.orderable,
    soldOut: row.dish.soldOut,
    dish: row.dish,
    variant: row.variant,
  };
}
