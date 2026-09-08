import { startOfLocalDay } from '@/domain/time/local-day';
import type { DbOrTx } from '@/server/db';
import { findUserById } from '@/server/repositories/user';

// Local midnight for this user. Daily caps and session counts key off it.
export async function startOfUserDay(
  tx: DbOrTx,
  userId: string,
  nowMs: number = Date.now(),
): Promise<Date> {
  const user = await findUserById(tx, userId);
  return new Date(startOfLocalDay(nowMs, user?.timezone ?? 'UTC'));
}
