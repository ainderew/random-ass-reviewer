import { and, eq, gte, sql } from 'drizzle-orm';
import type { UserStats } from '@/domain/types';
import type { DbOrTx } from '@/server/db';
import { userStats } from '@/server/db/schema';
import { AppError } from '@/server/errors';

type UserStatsRow = typeof userStats.$inferSelect;

function toUserStats(row: UserStatsRow): UserStats {
  return {
    userId: row.userId,
    focusBalance: row.focusBalance,
    insightBalance: row.insightBalance,
    xp: row.xp,
    level: row.level,
    streakDays: row.streakDays,
    streakFreezes: row.streakFreezes,
    lastSessionDate: row.lastSessionDate,
    pityCounter: row.pityCounter,
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

export interface BalanceDelta {
  focus?: number;
  insight?: number;
  xp?: number;
}

// Atomic `SET x = x + delta`. Never read-modify-write a balance.
export async function incrementBalances(
  tx: DbOrTx,
  userId: string,
  delta: BalanceDelta,
): Promise<UserStats> {
  const [row] = await tx
    .update(userStats)
    .set({
      focusBalance: sql`${userStats.focusBalance} + ${delta.focus ?? 0}`,
      insightBalance: sql`${userStats.insightBalance} + ${delta.insight ?? 0}`,
      xp: sql`${userStats.xp} + ${delta.xp ?? 0}`,
    })
    .where(eq(userStats.userId, userId))
    .returning();
  if (!row) throw new AppError('NOT_FOUND', 'User stats not found');
  return toUserStats(row);
}

export async function setLevel(
  tx: DbOrTx,
  userId: string,
  level: number,
): Promise<void> {
  await tx.update(userStats).set({ level }).where(eq(userStats.userId, userId));
}

// Conditional debit. Returns null when the balance cannot cover the cost, so
// two concurrent purchases can never drive a balance negative.
export async function debitBalances(
  tx: DbOrTx,
  userId: string,
  cost: { focus: number; insight: number },
): Promise<UserStats | null> {
  const [row] = await tx
    .update(userStats)
    .set({
      focusBalance: sql`${userStats.focusBalance} - ${cost.focus}`,
      insightBalance: sql`${userStats.insightBalance} - ${cost.insight}`,
    })
    .where(
      and(
        eq(userStats.userId, userId),
        gte(userStats.focusBalance, cost.focus),
        gte(userStats.insightBalance, cost.insight),
      ),
    )
    .returning();
  return row ? toUserStats(row) : null;
}

export async function updateStreakFields(
  tx: DbOrTx,
  userId: string,
  patch: { streakDays: number; streakFreezes: number; lastSessionDate: string },
): Promise<void> {
  await tx.update(userStats).set(patch).where(eq(userStats.userId, userId));
}

export async function setPityCounter(
  tx: DbOrTx,
  userId: string,
  value: number,
): Promise<void> {
  await tx
    .update(userStats)
    .set({ pityCounter: value })
    .where(eq(userStats.userId, userId));
}
