import { localDayKey, startOfLocalDay } from '@/domain/time/local-day';
import type { WeeklySummary } from '@/domain/types';
import { db } from '@/server/db';
import { listRecentReviews } from '@/server/repositories/card';
import { listCompletedSince } from '@/server/repositories/focus-session';
import { findUserById } from '@/server/repositories/user';

const DAY_MS = 86_400_000;
const HEAVY_WEEK_HOURS = 45;
const HEAVY_DAY_HOURS = 10;

// Monday-to-now, in the user's own days. Honest numbers, one calm line if
// the hours look unhealthy. Reviews count too: hours are not learning.
export async function getWeeklySummary(
  userId: string,
  nowMs = Date.now(),
): Promise<WeeklySummary> {
  const user = await findUserById(db, userId);
  const timeZone = user?.timezone ?? 'UTC';
  const todayStart = startOfLocalDay(nowMs, timeZone);
  const weekday = (new Date(todayStart).getUTCDay() + 6) % 7; // Monday = 0
  const weekStartMs = todayStart - weekday * DAY_MS;

  const [sessions, reviews] = await Promise.all([
    listCompletedSince(db, userId, new Date(weekStartMs)),
    listRecentReviews(
      db,
      { userId, since: new Date(weekStartMs) },
      { limit: 500 },
    ),
  ]);
  const byDay = new Map<string, number>();
  let totalMs = 0;
  for (const session of sessions) {
    const key = localDayKey(
      (session.endedAt ?? session.startedAt).getTime(),
      timeZone,
    );
    byDay.set(key, (byDay.get(key) ?? 0) + session.creditedMs);
    totalMs += session.creditedMs;
  }

  let bestDay: WeeklySummary['bestDay'] = null;
  for (const [date, ms] of byDay) {
    if (!bestDay || ms > bestDay.hours * 3_600_000)
      bestDay = { date, hours: ms / 3_600_000 };
  }
  const hours = totalMs / 3_600_000;
  return {
    weekStart: localDayKey(weekStartMs, timeZone),
    hours,
    sessions: sessions.length,
    cardsReviewed: reviews.length,
    retention:
      reviews.length === 0
        ? null
        : reviews.filter((r) => r.rating >= 3).length / reviews.length,
    bestDay,
    heavy: hours > HEAVY_WEEK_HOURS || (bestDay?.hours ?? 0) > HEAVY_DAY_HOURS,
  };
}
