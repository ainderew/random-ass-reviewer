import {
  reviewBatch,
  STUDY_BUDGETS,
  type TodayPlan,
} from '@/domain/review/today';
import { getReviewQueue } from './review';
import { getReviewStats } from './review-stats';
import { getMistakeChecks } from './mistakes';
import { db } from '@/server/db';
import { findUserById } from '@/server/repositories/user';
export async function getTodayPlan(userId: string): Promise<TodayPlan> {
  const [queue, stats, mistakes, user] = await Promise.all([
    getReviewQueue(userId),
    getReviewStats(userId),
    getMistakeChecks(userId),
    findUserById(db, userId),
  ]);
  const batches = Object.fromEntries(
    STUDY_BUDGETS.map((minutes) => {
      const batch = reviewBatch(queue, minutes);
      return [
        minutes,
        {
          total: batch.length,
          returning: batch.filter((c) => !c.isNew).length,
          fresh: batch.filter((c) => c.isNew).length,
        },
      ];
    }),
  ) as TodayPlan['batches'];
  const now = Date.now();
  return {
    batches,
    reviewedToday: stats.reviewedToday,
    approved: stats.totals.total,
    mistakesDue: mistakes.filter((m) => Date.parse(m.dueAt) <= now).length,
    nextMistakeAt:
      mistakes.find((m) => Date.parse(m.dueAt) > now)?.dueAt ?? null,
    examMonth: user?.examMonth ?? null,
  };
}
