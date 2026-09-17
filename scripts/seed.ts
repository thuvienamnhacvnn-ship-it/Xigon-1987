/**
 * Fills an empty database with the menu, the placeholder floor plan and two
 * demo offers.
 *
 * Idempotent: run it again and rows are updated in place rather than
 * duplicated, so a change in `seed-data.ts` reaches the running site with one
 * command. Stop the dev server first — PGlite allows a single writer.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { CATEGORIES, PROMOTIONS, TABLES } from './seed-data';

const dir = process.env.DATABASE_DIR ?? '.data/pg';
const client = new PGlite(dir);
const db = drizzle(client, { schema, casing: 'snake_case' });

const { categories, dishVariants, dishes, promotions, restaurantTables } = schema;

let categoryCount = 0;
let dishCount = 0;
let variantCount = 0;

for (const [index, category] of CATEGORIES.entries()) {
  const [categoryRow] = await db
    .insert(categories)
    .values({
      slug: category.slug,
      sort: index,
      nameDe: category.nameDe,
      nameEn: category.nameEn,
      nameVi: category.nameVi,
      noteDe: category.noteDe ?? null,
      noteEn: category.noteEn ?? null,
      noteVi: category.noteVi ?? null,
      published: true,
    })
    .onConflictDoUpdate({
      target: categories.slug,
      set: {
        sort: index,
        nameDe: category.nameDe,
        nameEn: category.nameEn,
        nameVi: category.nameVi,
        noteDe: category.noteDe ?? null,
        noteEn: category.noteEn ?? null,
        noteVi: category.noteVi ?? null,
      },
    })
    .returning();
  categoryCount += 1;

  for (const [dishIndex, dish] of category.dishes.entries()) {
    const values = {
      categoryId: categoryRow.id,
      slug: dish.slug,
      code: dish.code ?? null,
      sort: dishIndex,
      nameDe: dish.nameDe,
      nameEn: dish.nameEn ?? null,
      nameVi: dish.nameVi ?? null,
      descriptionDe: dish.descriptionDe ?? null,
      descriptionEn: dish.descriptionEn ?? null,
      descriptionVi: dish.descriptionVi ?? null,
      ingredientsDe: dish.ingredientsDe ?? null,
      ingredientsEn: dish.ingredientsEn ?? null,
      ingredientsVi: dish.ingredientsVi ?? null,
      photoId: dish.photoId ?? null,
      plateId: dish.plateId ?? null,
      sceneId: dish.sceneId ?? null,
      vegetarian: dish.vegetarian ?? false,
      vegan: dish.vegan ?? false,
      spice: dish.spice ?? 0,
      featured: dish.featured ?? false,
      published: true,
      // Allergen data has never been supplied. An empty list must read as
      // "ask us", never as "contains nothing".
      allergens: [] as string[],
      allergensConfirmed: false,
      priceConfirmed: false,
      sourceNote: dish.sourceNote ?? null,
    };

    const [dishRow] = await db
      .insert(dishes)
      .values(values)
      .onConflictDoUpdate({ target: dishes.slug, set: values })
      .returning();
    dishCount += 1;

    // Variants have no natural key, so they are replaced wholesale.
    await db.delete(dishVariants).where(eq(dishVariants.dishId, dishRow.id));
    await db.insert(dishVariants).values(
      dish.variants.map((variant, variantIndex) => ({
        dishId: dishRow.id,
        labelDe: variant.labelDe,
        labelEn: variant.labelEn ?? null,
        labelVi: variant.labelVi ?? null,
        priceCents: variant.priceCents,
        sort: variant.sort ?? variantIndex,
        isDefault: variant.isDefault ?? variantIndex === 0,
        orderable: variant.orderable ?? true,
      })),
    );
    variantCount += dish.variants.length;
  }
}

for (const table of TABLES) {
  const existing = await db.select().from(restaurantTables).where(eq(restaurantTables.code, table.code)).limit(1);
  if (existing.length) continue;
  await db.insert(restaurantTables).values({ ...table, active: true, confirmed: false });
}

for (const promotion of PROMOTIONS) {
  await db
    .insert(promotions)
    .values(promotion)
    .onConflictDoUpdate({ target: promotions.slug, set: promotion });
}

await client.close();

console.log(
  `seeded ${categoryCount} categories, ${dishCount} dishes, ${variantCount} variants, ` +
    `${TABLES.length} tables, ${PROMOTIONS.length} promotions into ${dir}`,
);
