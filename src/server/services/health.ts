import { sql } from 'drizzle-orm';
import { db } from '@/server/db';

// One cheap round trip. False means the container should be restarted.
export async function databaseReachable(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
