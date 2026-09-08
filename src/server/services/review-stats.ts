import { MATURE_INTERVAL_DAYS } from '@/domain/review/constants';
import { localDayKey, startOfLocalDay } from '@/domain/time/local-day';
import type { ReviewStats } from '@/domain/types';
import { db } from '@/server/db';
import {
  countCardsByMaturity,
  findNextDueAt,
  listCardsDueBetween,
  listDueCards,
  listRecentReviews,
} from '@/server/repositories/card';
import { findUserById } from '@/server/repositories/user';

const DAY_MS = 24 * 60 * 60 * 1000;
const FORECAST_DAYS = 7;
const RETENTION_WINDOW_MS = 30 * DAY_MS;

// The forecast is the point: seeing 80 due on Thursday is what makes someone
// do 20 today. Buckets are the user's own days.
export async function getReviewStats(userId: string): Promise<ReviewStats> {
  const now = new Date();
  const nowMs = now.getTime();
  const user = await findUserById(db, userId);
  const timeZone = user?.timezone ?? 'UTC';
  const dayStart = new Date(startOfLocalDay(nowMs, timeZone));
  const horizon = new Date(dayStart.getTime() + FORECAST_DAYS * DAY_MS);

  const [dueNow, recent, upcoming, totals, nextDueAt] = await Promise.all([
    listDueCards(db, { userId, now }, { limit: 500 }),
    listRecentReviews(
      db,
      { userId, since: new Date(nowMs - RETENTION_WINDOW_MS) },
      { limit: 500 },
    ),
    listCardsDueBetween(db, { userId, from: now, to: horizon }, { limit: 500 }),
    countCardsByMaturity(db, userId, MATURE_INTERVAL_DAYS),
    findNextDueAt(db, { userId, after: now }),
  ]);

  const reviewedToday = recent.filter((r) => r.reviewedAt >= dayStart).length;
  const retention =
    recent.length === 0
      ? null
      : recent.filter((r) => r.rating >= 3).length / recent.length;

  const todayKey = localDayKey(nowMs, timeZone);
  const counts = new Map<number, number>();
  for (const card of upcoming) {
    const key = localDayKey(card.nextDueAt.getTime(), timeZone);
    const offset = dayOffset(todayKey, key);
    if (offset >= 0 && offset < FORECAST_DAYS) {
      counts.set(offset, (counts.get(offset) ?? 0) + 1);
    }
  }
  // Everything already due lands on today.
  counts.set(0, (counts.get(0) ?? 0) + dueNow.length);

  return {
    dueNow: dueNow.length,
    nextDueAt,
    reviewedToday,
    retention,
    forecast: Array.from({ length: FORECAST_DAYS }, (_, dayOffset) => ({
      dayOffset,
      count: counts.get(dayOffset) ?? 0,
    })),
    totals,
  };
}

// Whole days between two YYYY-MM-DD keys.
function dayOffset(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / DAY_MS);
}
