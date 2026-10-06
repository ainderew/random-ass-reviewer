import {
  countStages,
  examPace,
  memoryStage,
  SOLID_STREAK,
  weekDays,
} from '@/domain/review/overview';
import { parseState } from '@/domain/review/scheduler';
import { MTLE_SUBJECTS } from '@/domain/study/medtech';
import { localDayKey, startOfLocalDay } from '@/domain/time/local-day';
import type { ProgressOverview } from '@/domain/types';
import { db } from '@/server/db';
import {
  countRecoveredCards,
  listLatestReviews,
  listRecentReviews,
  listStudyCards,
} from '@/server/repositories/card';
import { listCompletedSince } from '@/server/repositories/focus-session';
import { findUserById } from '@/server/repositories/user';

const DAY_MS = 86_400_000;

export async function getProgressOverview(
  userId: string,
  nowMs = Date.now(),
): Promise<ProgressOverview> {
  const user = await findUserById(db, userId);
  const timeZone = user?.timezone ?? 'UTC';
  const today = localDayKey(nowMs, timeZone);
  // Weekday from the local date itself; the UTC instant of local midnight can
  // fall on the previous day east of Greenwich.
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const weekStartMs = startOfLocalDay(nowMs, timeZone) - weekday * DAY_MS;

  const [studyCards, latest, recovered, sessions, reviews] = await Promise.all([
    listStudyCards(db, userId),
    listLatestReviews(db, userId, SOLID_STREAK),
    countRecoveredCards(db, userId),
    listCompletedSince(db, userId, new Date(weekStartMs)),
    listRecentReviews(
      db,
      { userId, since: new Date(weekStartMs), includeQuiz: true },
      { limit: 500 },
    ),
  ]);

  const byCard = new Map<string, typeof latest>();
  for (const review of latest)
    byCard.set(review.cardId, [...(byCard.get(review.cardId) ?? []), review]);
  const staged = studyCards.map((card) => ({
    subject: card.subject,
    stage: memoryStage(
      byCard.get(card.id) ?? [],
      parseState(card.fsrsState, nowMs).reps,
    ),
  }));
  const cards = countStages(staged.map((c) => c.stage));
  const dailyNewLimit = user?.dailyNewCards ?? 20;

  const active = new Set<string>([
    ...reviews.map((r) => localDayKey(r.reviewedAt.getTime(), timeZone)),
    ...sessions.map((s) =>
      localDayKey((s.endedAt ?? s.startedAt).getTime(), timeZone),
    ),
  ]);

  return {
    today,
    cards,
    subjects: MTLE_SUBJECTS.map(({ id }) => ({
      subject: id,
      stages: countStages(
        staged.filter((c) => c.subject === id).map((c) => c.stage),
      ),
    })),
    examMonth: user?.examMonth ?? null,
    exam: examPace({
      examMonth: user?.examMonth ?? null,
      today,
      notStarted: cards.new,
      dailyNewLimit,
    }),
    dailyNewLimit,
    recovered,
    week: {
      days: weekDays({
        weekStart: localDayKey(weekStartMs, timeZone),
        today,
        active,
      }),
      focusMinutes: Math.round(
        sessions.reduce((sum, s) => sum + s.creditedMs, 0) / 60_000,
      ),
      reviews: reviews.length,
    },
  };
}
