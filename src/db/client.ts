import 'server-only';

import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';

/**
 * The database handle.
 *
 * PGlite is Postgres compiled to WebAssembly, running in this process against a
 * directory on disk. It is here because a native Postgres cannot be installed
 * on this machine, and it speaks the same SQL — so moving to a real server
 * later is a connection-string change, not a rewrite.
 *
 * PGlite allows exactly one open handle on a data directory. A second one does
 * not fail politely: the WebAssembly module aborts, and the abort surfaces far
 * away as an unhandled rejection. So the instance is created lazily, on first
 * use, and parked on `globalThis` — module evaluation happens more than once
 * under a bundler and on every hot reload, and neither may open a second
 * database.
 *
 * The same rule applies outside the server: stop `npm run dev` before running
 * the migration or the seed script.
 */
declare global {
  // eslint-disable-next-line no-var
  var __xigonPglite: PGlite | undefined;
  // eslint-disable-next-line no-var
  var __xigonDb: PgliteDatabase<typeof schema> | undefined;
}

export const DATA_DIR = process.env.DATABASE_DIR ?? '.data/pg';

function open(): PgliteDatabase<typeof schema> {
  if (!globalThis.__xigonDb) {
    // Assigned before anything can await, so two callers cannot both construct.
    globalThis.__xigonPglite ??= new PGlite(DATA_DIR);
    globalThis.__xigonDb = drizzle(globalThis.__xigonPglite, { schema, casing: 'snake_case' });
  }
  return globalThis.__xigonDb;
}

/**
 * Behaves like the drizzle instance but defers opening the database until a
 * query is actually issued — so importing this module is free, and a page that
 * never touches the database never opens it.
 */
export const db = new Proxy({} as PgliteDatabase<typeof schema>, {
  get(_target, property, receiver) {
    const instance = open() as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(instance, property, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export { schema };
