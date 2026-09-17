/**
 * Applies the generated SQL migrations to the local PGlite database.
 *
 * PGlite lets exactly one process hold the data directory. Stop `npm run dev`
 * before running this, or it will fail to open the database.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const dir = process.env.DATABASE_DIR ?? '.data/pg';

const client = new PGlite(dir);
const db = drizzle(client);

await migrate(db, { migrationsFolder: './drizzle' });
await client.close();

console.log(`migrations applied to ${dir}`);
