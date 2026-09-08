// Applies the drizzle migration journal against DATABASE_URL using only `pg`.
// The standalone image bundles drizzle-orm into the server, so this mirrors
// drizzle's own migrator: same `drizzle.__drizzle_migrations` table, same
// sha256 hashes, same `created_at` ordering. `drizzle-kit migrate` and this
// script can be used interchangeably on one database.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[migrate] DATABASE_URL is not set');
  process.exit(1);
}
const folder = process.env.MIGRATIONS_FOLDER ?? './drizzle';

function readJournal() {
  const journal = JSON.parse(
    readFileSync(join(folder, 'meta', '_journal.json'), 'utf8'),
  );
  return journal.entries.map((entry) => {
    const sql = readFileSync(join(folder, `${entry.tag}.sql`), 'utf8');
    return {
      tag: entry.tag,
      folderMillis: entry.when,
      hash: createHash('sha256').update(sql).digest('hex'),
      statements: entry.breakpoints
        ? sql.split('--> statement-breakpoint')
        : [sql],
    };
  });
}

const pool = new pg.Pool({ connectionString: url });
const client = await pool.connect();
try {
  await client.query('CREATE SCHEMA IF NOT EXISTS "drizzle"');
  await client.query(
    'CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)',
  );
  const last = await client.query(
    'SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at DESC LIMIT 1',
  );
  const lastMillis = last.rows[0] ? Number(last.rows[0].created_at) : 0;
  const pending = readJournal().filter((m) => m.folderMillis > lastMillis);
  if (pending.length === 0) {
    console.log('[migrate] up to date');
  } else {
    await client.query('BEGIN');
    try {
      for (const migration of pending) {
        for (const statement of migration.statements) {
          if (statement.trim()) await client.query(statement);
        }
        await client.query(
          'INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)',
          [migration.hash, migration.folderMillis],
        );
        console.log(`[migrate] applied ${migration.tag}`);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} catch (error) {
  console.error('[migrate] failed', error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
