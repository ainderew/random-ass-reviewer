import { validQuizContent } from '@/domain/study/quiz-content';
import { sourcesForChunks } from '@/server/repositories/card-source';
import { calculateReviewInsight } from '@/domain/economy/insight';
import { selectQueue } from '@/domain/review/queue';
import {
  parseState,
  previewIntervals,
  scheduleReview,
} from '@/domain/review/scheduler';
import { startOfLocalDay } from '@/domain/time/local-day';
import type { AnswerResult, QueuedCard, Rating } from '@/domain/types';
import { db, type DbOrTx } from '@/server/db';
import { AppError } from '@/server/errors';
import {
  countCardsFirstReviewedSince,
  lockCard,
  hasRecallSince,
  insertCardReview,
  listDueCards,
  listRecentReviews,
  updateCardSchedule,
} from '@/server/repositories/card';
import { findUserById } from '@/server/repositories/user';
import { incrementBalances } from '@/server/repositories/user-stats';

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
    dailyNewLimit: (await findUserById(db, userId))?.dailyNewCards ?? 20,
  });

  const sources = new Map(
    (
      await sourcesForChunks(
        db,
        userId,
        queue.map(({ card }) => card.chunkId),
      )
    ).map(({ chunkId, ...source }) => [chunkId, source]),
  );
  return queue.map(({ card, state }) => ({
    source: sources.get(card.chunkId),
    id: card.id,
    question: card.question,
    answer: card.answer,
    sourceQuote: card.sourceQuote,
    tags: card.tags,
    quiz: card.quiz,
    answerType: card.answerType,
    reviewCount: state.reps,
    relearning: state.state === 3,
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
  practiceType?: 'recall' | 'write' | 'choice';
  selectedAnswer?: string;
}): Promise<AnswerResult> {
  return db.transaction(async (tx) => {
    const card = await lockCard(tx, input.userId, input.cardId);
    if (!card || card.userId !== input.userId) {
      throw new AppError('NOT_FOUND', 'Card not found');
    }
    const nowMs = Date.now();
    if (card.reviewStatus !== 'approved' || card.suspended)
      throw new AppError(
        'INVALID_STATE',
        'This card needs approval before reviewing.',
      );
    if (card.nextDueAt.getTime() > nowMs)
      throw new AppError(
        'INVALID_STATE',
        'This review has already been saved or is not due yet.',
      );
    let correct: boolean | null = null;
    if (input.practiceType === 'choice') {
      if (
        !card.quiz ||
        !validQuizContent(card.answer, card.quiz) ||
        ![card.answer, ...card.quiz.distractors.map((d) => d.text)].includes(
          input.selectedAnswer ?? '',
        )
      )
        throw new AppError(
          'VALIDATION',
          'Choose one of the current card options.',
        );
      correct = input.selectedAnswer === card.answer;
      if (!correct && input.rating !== 1)
        throw new AppError(
          'VALIDATION',
          'An incorrect choice must be rated Again.',
        );
    } else if (input.selectedAnswer !== undefined) {
      throw new AppError(
        'VALIDATION',
        'An option is only accepted for multiple-choice reviews.',
      );
    }
    const previousReview = card.fsrsState.last_review
      ? Date.parse(card.fsrsState.last_review)
      : NaN;
    const delayDays = Number.isFinite(previousReview)
      ? Math.max(0, (nowMs - previousReview) / 86400000)
      : null;
    const rewardedToday = await hasRecallSince(
      tx,
      card.id,
      await userDayStart(tx, input.userId, nowMs),
    );
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
      practiceType: input.practiceType,
      correct,
      delayDays,
      subject: card.subject,
    });

    const recent = await listRecentReviews(
      tx,
      { userId: input.userId },
      { limit: 50 },
    );
    const run = consecutiveCorrect(recent.map((r) => r.rating));
    const insight = rewardedToday ? 0 : calculateReviewInsight();
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
