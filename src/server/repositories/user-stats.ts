import { eq } from 'drizzle-orm';
import type { UserStats } from '@/domain/types';
import type { DbOrTx } from '@/server/db';
import { userStats } from '@/server/db/schema';

type UserStatsRow = typeof userStats.$inferSelect;

function toUserStats(row: UserStatsRow): UserStats {
  return {
    userId: row.userId,
    streakDays: row.streakDays,
    streakFreezes: row.streakFreezes,
    lastSessionDate: row.lastSessionDate,
  };
}

export async function createUserStats(
  tx: DbOrTx,
  userId: string,
): Promise<UserStats> {
  const [row] = await tx.insert(userStats).values({ userId }).returning();
  if (!row) throw new Error('createUserStats returned no row');
  return toUserStats(row);
}

export async function findUserStats(
  tx: DbOrTx,
  userId: string,
): Promise<UserStats | null> {
  const row = await tx.query.userStats.findFirst({
    where: eq(userStats.userId, userId),
  });
  return row ? toUserStats(row) : null;
}

export async function updateStreakFields(
  tx: DbOrTx,
  userId: string,
  patch: { streakDays: number; streakFreezes: number; lastSessionDate: string },
): Promise<void> {
  await tx.update(userStats).set(patch).where(eq(userStats.userId, userId));
}
