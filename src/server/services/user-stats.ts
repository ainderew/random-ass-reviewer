import type {
  DailySummary,
  PublicUserStats,
  StatsSnapshot,
  UserStats,
} from '@/domain/types';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import {
  countSessionsSince,
  listCompletedSince,
  sumCreditedSince,
} from '@/server/repositories/focus-session';
import { findUserStats } from '@/server/repositories/user-stats';
import { startOfUserDay } from './local-day';

export async function getUserStats(userId: string): Promise<UserStats> {
  const stats = await findUserStats(db, userId);
  if (!stats) throw new AppError('NOT_FOUND', 'User stats not found');
  return stats;
}

export async function getDailySummary(userId: string): Promise<DailySummary> {
  const dayStart = await startOfUserDay(db, userId);
  const [creditedMs, sessionsStarted, completed] = await Promise.all([
    sumCreditedSince(db, userId, dayStart),
    countSessionsSince(db, userId, dayStart),
    listCompletedSince(db, userId, dayStart),
  ]);
  const sessions = completed
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
    .map((s) => ({ creditedMs: s.creditedMs }));
  return { creditedMs, sessionsStarted, sessions };
}

// The pity counter never leaves the server. Exposing it would let a user
// time sessions to farm guaranteed rares.
export function toPublicStats(stats: UserStats): PublicUserStats {
  const publicStats: PublicUserStats & { pityCounter?: number } = { ...stats };
  delete publicStats.pityCounter;
  return publicStats;
}

// Everything the HUD and the idle timer screen need, in one fetch.
export async function getStatsSnapshot(userId: string): Promise<StatsSnapshot> {
  const [stats, today] = await Promise.all([
    getUserStats(userId),
    getDailySummary(userId),
  ]);
  return { stats: toPublicStats(stats), today };
}
