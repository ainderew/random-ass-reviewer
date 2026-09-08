import { sql } from 'drizzle-orm';
import type { DbOrTx } from '@/server/db';
import { rateLimits } from '@/server/db/schema';

export interface WindowHit {
  count: number;
  windowStart: Date;
}

// One atomic upsert: start a fresh window when the old one has expired,
// otherwise add one. The count comes back so the caller decides.
export async function hitWindow(
  tx: DbOrTx,
  input: { userId: string; bucket: string; windowMs: number; now: Date },
): Promise<WindowHit> {
  const expiresBefore = new Date(input.now.getTime() - input.windowMs);
  const [row] = await tx
    .insert(rateLimits)
    .values({
      userId: input.userId,
      bucket: input.bucket,
      windowStart: input.now,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [rateLimits.userId, rateLimits.bucket],
      set: {
        count: sql`case when ${rateLimits.windowStart} <= ${expiresBefore} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} <= ${expiresBefore} then ${input.now} else ${rateLimits.windowStart} end`,
      },
    })
    .returning({
      count: rateLimits.count,
      windowStart: rateLimits.windowStart,
    });
  if (!row) throw new Error('hitWindow returned no row');
  return row;
}
