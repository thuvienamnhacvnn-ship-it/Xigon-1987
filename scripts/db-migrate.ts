/**
 * Applies the generated SQL migrations to the local PGlite database.
 *
 * PGlite lets exactly one process hold the data directory. Stop `npm run dev`
 * before running this, or it will fail to open the database.
 */
import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const dir = process.env.DATABASE_DIR ?? '.data/pg';

/*
 * PGlite creates its own directory but not the one above it, so on a machine
 * where `.data` does not exist yet the first migration dies with an ENOENT
 * wrapped in a Drizzle query error — which reads like a broken migration
 * rather than a missing folder. It cost a deploy once.
 */
mkdirSync(dir, { recursive: true });

const client = new PGlite(dir);
const db = drizzle(client);

await migrate(db, { migrationsFolder: './drizzle' });
await client.close();

console.log(`migrations applied to ${dir}`);
