import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/lib/env';
import * as schema from './schema';

// Next dev reloads modules on every edit. Cache the pool on globalThis so a
// long session does not leak one connection pool per save.
const globalForDb = globalThis as unknown as { aloftPool?: Pool };

const pool =
  globalForDb.aloftPool ?? new Pool({ connectionString: env.DATABASE_URL });

if (env.NODE_ENV !== 'production') {
  globalForDb.aloftPool = pool;
}

export const db = drizzle(pool, { schema });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
// Repositories take this so services can compose them inside one transaction.
export type DbOrTx = Db | Tx;

export async function closeDb(): Promise<void> {
  await pool.end();
  globalForDb.aloftPool = undefined;
}
