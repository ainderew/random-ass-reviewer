import { exportQuizAttempts } from '@/server/repositories/quiz';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import {
  listRecentReviews,
  listAllUserCards,
} from '@/server/repositories/card';
import { listCompletedSince } from '@/server/repositories/focus-session';
import {
  findIslandByUserId,
  listPlacements,
} from '@/server/repositories/island';
import { listNoteSources } from '@/server/repositories/note';
import { findUserById } from '@/server/repositories/user';
import { findUserStats } from '@/server/repositories/user-stats';

// Plain data, no secrets: the encrypted key stays behind.
export async function exportUserData(userId: string) {
  const user = await findUserById(db, userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found');
  const island = await findIslandByUserId(db, userId);
  const [stats, sessions, notes, cards, reviews, placements] =
    await Promise.all([
      findUserStats(db, userId),
      listCompletedSince(db, userId, new Date(0)),
      listNoteSources(db, userId, { limit: 500 }),
      listAllUserCards(db, userId),
      listRecentReviews(db, { userId, includeQuiz: true }, { limit: 500 }),
      island ? listPlacements(db, island.id) : Promise.resolve([]),
    ]);
  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      timeZone: user.timezone,
      createdAt: user.createdAt,
      dailyCapMs: user.dailyCapMs,
      breakReminderMs: user.breakReminderMs,
      examMonth: user.examMonth,
      dailyNewCards: user.dailyNewCards,
    },
    quizAttempts: await exportQuizAttempts(db, userId),
    stats,
    sessions,
    notes,
    cards,
    reviews,
    island: island ? { ...island, placements } : null,
  };
}
