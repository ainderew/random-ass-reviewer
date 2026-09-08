import {
  calculateReviewInsight,
  type CardDifficulty,
} from '@/domain/economy/insight';
import { selectQueue } from '@/domain/review/queue';
import {
  parseState,
  previewIntervals,
  scheduleReview,
} from '@/domain/review/scheduler';
import { startOfLocalDay } from '@/domain/time/local-day';
import type { AnswerResult, Card, QueuedCard, Rating } from '@/domain/types';
import { db, type DbOrTx } from '@/server/db';
import { AppError } from '@/server/errors';
import {
  countCardsFirstReviewedSince,
  findCardById,
  insertCardReview,
  listDueCards,
  listRecentReviews,
  updateCardSchedule,
} from '@/server/repositories/card';
import { findUserById } from '@/server/repositories/user';
import { incrementBalances } from '@/server/repositories/user-stats';

export function cardDifficulty(card: Pick<Card, 'tags'>): CardDifficulty {
  if (card.tags.includes('hard')) return 'hard';
  if (card.tags.includes('easy')) return 'easy';
  return 'medium';
}

async function userDayStart(
  tx: DbOrTx,
  userId: string,
  nowMs: number,
): Promise<Date> {
  const user = await findUserById(tx, userId);
  return new Date(startOfLocalDay(nowMs, user?.timezone ?? 'UTC'));
}

export async function getReviewQueue(userId: string): Promise<QueuedCard[]> {
  const now = new Date();
  const nowMs = now.getTime();
  const [due, dayStart] = await Promise.all([
    listDueCards(db, { userId, now }, { limit: 500 }),
    userDayStart(db, userId, nowMs),
  ]);
  const newCardsSeenToday = await countCardsFirstReviewedSince(db, {
    userId,
    since: dayStart,
  });

  const withState = due.map((card) => ({
    card,
    state: parseState(card.fsrsState, nowMs),
    nextDueAtMs: card.nextDueAt.getTime(),
    id: card.id,
  }));
  const queue = selectQueue({
    due: withState.filter((c) => c.state.state !== 0),
    newCards: withState.filter((c) => c.state.state === 0),
    newCardsSeenToday,
    nowMs,
  });

  return queue.map(({ card, state }) => ({
    id: card.id,
    question: card.question,
    answer: card.answer,
    sourceQuote: card.sourceQuote,
    tags: card.tags,
    isNew: state.state === 0,
    dueAt: card.nextDueAt,
    intervals: previewIntervals({ state, nowMs }),
  }));
}

// Leading run of ratings above Again, most recent first.
export function consecutiveCorrect(ratings: readonly Rating[]): number {
  let run = 0;
  for (const rating of ratings) {
    if (rating === 1) break;
    run += 1;
  }
  return run;
}

// One transaction: schedule, record, pay. The server rates money; the client
// only reports which button was pressed.
export async function submitAnswer(input: {
  userId: string;
  cardId: string;
  rating: Rating;
  elapsedMs: number;
}): Promise<AnswerResult> {
  return db.transaction(async (tx) => {
    const card = await findCardById(tx, input.cardId);
    if (!card || card.userId !== input.userId) {
      throw new AppError('NOT_FOUND', 'Card not found');
    }
    const nowMs = Date.now();
    const scheduled = scheduleReview({
      state: parseState(card.fsrsState, nowMs),
      rating: input.rating,
      nowMs,
    });
    await updateCardSchedule(tx, card.id, {
      nextDueAt: new Date(scheduled.nextDueAtMs),
      fsrsState: scheduled.state,
    });

    await insertCardReview(tx, {
      cardId: card.id,
      sessionId: null,
      rating: input.rating,
      elapsedMs: Math.min(input.elapsedMs, 10 * 60 * 1000),
    });

    const recent = await listRecentReviews(
      tx,
      { userId: input.userId },
      { limit: 50 },
    );
    const run = consecutiveCorrect(recent.map((r) => r.rating));
    const insight = calculateReviewInsight({
      rating: input.rating,
      difficulty: cardDifficulty(card),
      consecutiveCorrect: run,
    });
    const stats = await incrementBalances(tx, input.userId, {
      insight,
      xp: insight,
    });

    return {
      cardId: card.id,
      rating: input.rating,
      nextDueAt: new Date(scheduled.nextDueAtMs),
      intervalDays: scheduled.intervalDays,
      insightAwarded: insight,
      consecutiveCorrect: run,
      insightBalance: stats.insightBalance,
    };
  });
}
