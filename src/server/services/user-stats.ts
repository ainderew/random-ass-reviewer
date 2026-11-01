import { summarizeStreak } from '@/domain/economy/streak';
import { MIN_SESSION_MS } from '@/domain/economy/constants';
import { localDayKey } from '@/domain/time/local-day';
import { findUserById } from '@/server/repositories/user';
import { env } from '@/lib/env';
import type {
  DailySummary,
  PublicUserStats,
  StatsSnapshot,
  UserStats,
} from '@/domain/types';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import type { CareerProgress } from '@/domain/career/milestones';
import { countRecalled } from '@/server/repositories/card';
import {
  countHighGradeQuizzes,
  countSessionsSince,
  listCompletedSince,
  sumCreditedAllTime,
  sumCreditedSince,
} from '@/server/repositories/focus-session';
import { findUserStats } from '@/server/repositories/user-stats';
import { startOfUserDay } from './local-day';

export async function getUserStats(userId: string): Promise<UserStats> {
  const stats = await findUserStats(db, userId);
  if (!stats) throw new AppError('NOT_FOUND', 'User stats not found');
  return stats;
}

export async function getDailySummary(
  userId: string,
  nowMs = Date.now(),
): Promise<DailySummary> {
  const dayStart = await startOfUserDay(db, userId, nowMs);
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

// Shared study statistics for the client.
export function toPublicStats(stats: UserStats): PublicUserStats {
  return { ...stats };
}

export async function getCareerProgress(
  userId: string,
): Promise<CareerProgress> {
  const [focusMs, highGrades, cardsRecalled] = await Promise.all([
    sumCreditedAllTime(db, userId),
    countHighGradeQuizzes(db, userId),
    countRecalled(db, userId),
  ]);
  return { focusMs, highGrades, cardsRecalled };
}

// Everything the HUD and the idle timer screen need, in one fetch.
export async function getStatsSnapshot(
  userId: string,
  now = Date.now(),
): Promise<StatsSnapshot> {
  const [stats, today, career, user] = await Promise.all([
    getUserStats(userId),
    getDailySummary(userId, now),
    getCareerProgress(userId),
    findUserById(db, userId),
  ]);
  return {
    stats: toPublicStats(stats),
    today,
    career,
    streak: summarizeStreak(
      {
        lastSessionDate: stats.lastSessionDate,
        todayDate: localDayKey(now, user?.timezone ?? 'UTC'),
        currentStreak: stats.streakDays,
        freezesRemaining: stats.streakFreezes,
      },
      Math.ceil((env.MIN_SESSION_MS_OVERRIDE ?? MIN_SESSION_MS) / 60_000),
    ),
  };
}
