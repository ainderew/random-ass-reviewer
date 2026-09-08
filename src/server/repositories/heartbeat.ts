import { asc, desc, eq } from 'drizzle-orm';
import type { Heartbeat } from '@/domain/types';
import type { DbOrTx } from '@/server/db';
import { sessionHeartbeats } from '@/server/db/schema';
import { clampPage, type Page } from './pagination';

type HeartbeatRow = typeof sessionHeartbeats.$inferSelect;

function toHeartbeat(row: HeartbeatRow): Heartbeat {
  return {
    sessionId: row.sessionId,
    seq: row.seq,
    at: row.at,
    focused: row.focused,
  };
}

// `at` is server receipt time. A replayed seq hits the primary key and comes
// back as null instead of aborting the surrounding transaction.
export async function insertHeartbeat(
  tx: DbOrTx,
  input: { sessionId: string; seq: number; focused: boolean },
): Promise<Heartbeat | null> {
  const [row] = await tx
    .insert(sessionHeartbeats)
    .values({ ...input, at: new Date() })
    .onConflictDoNothing()
    .returning();
  return row ? toHeartbeat(row) : null;
}

export async function getLastHeartbeat(
  tx: DbOrTx,
  sessionId: string,
): Promise<Heartbeat | null> {
  const [row] = await tx
    .select()
    .from(sessionHeartbeats)
    .where(eq(sessionHeartbeats.sessionId, sessionId))
    .orderBy(desc(sessionHeartbeats.seq))
    .limit(1);
  return row ? toHeartbeat(row) : null;
}

// Oldest first, so the accumulator can walk consecutive pairs.
export async function listHeartbeats(
  tx: DbOrTx,
  sessionId: string,
  page?: Partial<Page>,
): Promise<Heartbeat[]> {
  const { limit, offset } = clampPage(page);
  const rows = await tx
    .select()
    .from(sessionHeartbeats)
    .where(eq(sessionHeartbeats.sessionId, sessionId))
    .orderBy(asc(sessionHeartbeats.at), asc(sessionHeartbeats.seq))
    .limit(limit)
    .offset(offset);
  return rows.map(toHeartbeat);
}
