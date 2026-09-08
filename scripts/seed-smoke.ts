import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Seeds the smoke user and a 30-day session cookie into DATABASE_URL so the
// end-to-end suite can sign in without Google. Development and CI only.
config({ path: process.env.DOTENV_PATH ?? '.env.test' });
if (process.env.NODE_ENV === 'production')
  throw new Error('Never seed a production database');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const userId = 'smoke-user';
const token = process.env.SMOKE_SESSION_TOKEN ?? 'smoke-token';

async function main(): Promise<void> {
  await db.execute(`
    INSERT INTO users (id, email, name, timezone)
    VALUES ('${userId}', 'smoke@aloft.local', 'Smoke Tester', 'UTC')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO user_stats (user_id, focus_balance, insight_balance, xp, level)
    VALUES ('${userId}', 2000, 100, 3000, 9)
    ON CONFLICT (user_id) DO UPDATE SET focus_balance = greatest(user_stats.focus_balance, 2000), level = greatest(user_stats.level, 9);
    INSERT INTO islands (user_id) VALUES ('${userId}') ON CONFLICT (user_id) DO NOTHING;
    -- Empty sessions from earlier runs would trip the twelve-a-day cap.
    DELETE FROM focus_sessions
    WHERE user_id = '${userId}' AND status <> 'active' AND credited_ms = 0
      AND started_at > now() - interval '1 day';
    INSERT INTO sessions (session_token, user_id, expires)
    VALUES ('${token}', '${userId}', now() + interval '30 days')
    ON CONFLICT (session_token) DO UPDATE SET expires = now() + interval '30 days';
  `);
  console.log(`seeded ${userId} with session ${token}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
