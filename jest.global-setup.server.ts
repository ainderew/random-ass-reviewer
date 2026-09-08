import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

// Runs once before the server project. Self-contained on purpose: Jest loads
// this file outside the module mapper, so no `@/` imports here.
export default async function globalSetup(): Promise<void> {
  config({ path: '.env.test' });
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing from .env.test');

  const pool = new Pool({ connectionString });
  try {
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  } catch (error) {
    throw new Error(
      `Could not migrate the test database. Is Postgres running? Try \`pnpm db:up\`.\n${String(error)}`,
    );
  } finally {
    await pool.end();
  }
}
