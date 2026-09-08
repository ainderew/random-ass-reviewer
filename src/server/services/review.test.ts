import { eq } from 'drizzle-orm';
import {
  DAILY_CREDITABLE_MS,
  INSIGHT_PER_CORRECT,
} from '@/domain/economy/constants';
import { initialCardState } from '@/domain/review/scheduler';
import type { FsrsState } from '@/domain/types';
import { HEARTBEAT_INTERVAL_MS } from '@/domain/session/constants';
import { closeDb, db } from '@/server/db';
import {
  cardReviews,
  cards,
  focusSessions,
  sessionHeartbeats,
  users,
} from '@/server/db/schema';
import { AppError } from '@/server/errors';
import { insertCards } from '@/server/repositories/card';
import { insertNoteChunks, insertNoteSource } from '@/server/repositories/note';
import { findUserStats } from '@/server/repositories/user-stats';
import { endSession } from './end-session';
import { getReviewQueue, submitAnswer } from './review';
import { getReviewStats } from './review-stats';
import {
  answerQuizQuestion,
  finishSessionQuiz,
  getSessionQuiz,
} from './session-quiz';
import { createUserWithDefaults } from './user-bootstrap';

const minutes = (n: number) => n * 60_000;

async function makeUser(tag: string): Promise<string> {
  const user = await createUserWithDefaults({
    id: 'ignored',
    email: `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
    emailVerified: null,
  });
  return user.id;
}

// Ten cards with distinct answers, all due now.
async function seedDeck(userId: string, count = 10) {
  const source = await insertNoteSource(db, {
    userId,
    kind: 'paste',
    title: 'Deck',
    contentHash: `hash-${userId}`,
  });
  const [chunk] = await insertNoteChunks(db, [
    { sourceId: source.id, ordinal: 0, text: 'chunk text', tokenCount: 10 },
  ]);
  const now = Date.now();
  return insertCards(
    db,
    Array.from({ length: count }, (_, i) => ({
      userId,
      chunkId: chunk!.id,
      question: `Question ${i}?`,
      answer: `Answer ${i}`,
      sourceQuote: 'chunk text',
      tags: i % 3 === 0 ? ['hard'] : ['medium'],
      nextDueAt: new Date(now - i * 1000),
      fsrsState: initialCardState(now - i * 1000),
    })),
  );
}

async function seedSession(userId: string, spanMs: number): Promise<string> {
  const now = Date.now();
  const [session] = await db
    .insert(focusSessions)
    .values({ userId, lootSeed: 'seed', startedAt: new Date(now - spanMs) })
    .returning();
  const beats = [];
  for (let at = now - spanMs, seq = 0; at <= now; at += HEARTBEAT_INTERVAL_MS) {
    beats.push({
      sessionId: session!.id,
      seq: seq++,
      at: new Date(at),
      focused: true,
    });
  }
  await db.insert(sessionHeartbeats).values(beats);
  return session!.id;
}

describe('review service', () => {
  const created: string[] = [];

  afterAll(async () => {
    for (const id of created) await db.delete(users).where(eq(users.id, id));
    await closeDb();
  });

  it('queues due cards, schedules on answer, records the review, and pays Insight atomically', async () => {
    const userId = await makeUser('review');
    created.push(userId);
    const deck = await seedDeck(userId);

    const queue = await getReviewQueue(userId);
    expect(queue).toHaveLength(deck.length);
    expect(queue[0]!.isNew).toBe(true);
    expect(queue[0]!.intervals[4]).toBeGreaterThan(queue[0]!.intervals[3]);

    const first = queue[0]!;
    const before = await findUserStats(db, userId);
    const result = await submitAnswer({
      userId,
      cardId: first.id,
      rating: 3,
      elapsedMs: 4200,
    });

    expect(result.nextDueAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.insightAwarded).toBeGreaterThanOrEqual(INSIGHT_PER_CORRECT);
    expect(result.consecutiveCorrect).toBe(1);
    const after = await findUserStats(db, userId);
    expect(after!.insightBalance - before!.insightBalance).toBe(
      result.insightAwarded,
    );
    const row = await db.query.cards.findFirst({
      where: eq(cards.id, first.id),
    });
    expect(row!.nextDueAt.getTime()).toBe(result.nextDueAt.getTime());
    expect((row!.fsrsState as { reps: number }).reps).toBe(1);
    const reviews = await db
      .select()
      .from(cardReviews)
      .where(eq(cardReviews.cardId, first.id));
    expect(reviews).toHaveLength(1);
    expect(reviews[0]!.sessionId).toBeNull();

    // Again pays nothing and never deducts.
    const again = await submitAnswer({
      userId,
      cardId: queue[1]!.id,
      rating: 1,
      elapsedMs: 10,
    });
    expect(again.insightAwarded).toBe(0);
    expect(again.consecutiveCorrect).toBe(0);
  });

  it("refuses another user's card", async () => {
    const owner = await makeUser('owner');
    const intruder = await makeUser('intruder');
    created.push(owner, intruder);
    const [card] = await seedDeck(owner, 1);
    await expect(
      submitAnswer({
        userId: intruder,
        cardId: card!.id,
        rating: 3,
        elapsedMs: 1,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('resets a corrupt fsrs_state instead of crashing the queue', async () => {
    const userId = await makeUser('corrupt');
    created.push(userId);
    const [card] = await seedDeck(userId, 1);
    await db
      .update(cards)
      .set({
        fsrsState: {
          difficulty: 0,
          stability: 0,
          retrievability: 0,
          reps: 0,
          lapses: 0,
        } as unknown as FsrsState,
      })
      .where(eq(cards.id, card!.id));
    const queue = await getReviewQueue(userId);
    expect(queue).toHaveLength(1);
    const result = await submitAnswer({
      userId,
      cardId: card!.id,
      rating: 3,
      elapsedMs: 1,
    });
    expect(result.intervalDays).toBeGreaterThan(0);
  });

  it('builds a keyless quiz from seen cards, grades once per card, and finishes once', async () => {
    const userId = await makeUser('quiz');
    created.push(userId);
    const deck = await seedDeck(userId, 10);
    // See every card once so they qualify.
    for (const card of deck)
      await submitAnswer({ userId, cardId: card.id, rating: 3, elapsedMs: 1 });
    const sessionId = await seedSession(userId, minutes(20));

    const quiz = await getSessionQuiz({ userId, sessionId });
    expect(quiz.questions).toHaveLength(8);
    expect(quiz.submitted).toBe(false);
    const body = JSON.stringify(quiz);
    expect(body).not.toMatch(/correctIndex|"answer"/);
    for (const q of quiz.questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
    }
    // Stable across fetches.
    expect(await getSessionQuiz({ userId, sessionId })).toEqual(quiz);

    // Grade: pick the true answer for six, a wrong one for two.
    const byId = new Map(deck.map((c) => [c.id, c.answer]));
    let progress = null;
    for (const [i, q] of quiz.questions.entries()) {
      const correctIndex = q.options.indexOf(byId.get(q.cardId)!);
      const optionIndex = i < 6 ? correctIndex : (correctIndex + 1) % 4;
      progress = await answerQuizQuestion({
        userId,
        sessionId,
        cardId: q.cardId,
        optionIndex,
      });
      expect(progress.correct).toBe(i < 6);
    }
    expect(progress).toMatchObject({
      correctSoFar: 6,
      answered: 8,
      total: 8,
      multiplier: 1,
    });

    // A second attempt at a card is refused.
    await expect(
      answerQuizQuestion({
        userId,
        sessionId,
        cardId: quiz.questions[0]!.cardId,
        optionIndex: 0,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });

    const before = await findUserStats(db, userId);
    const result = await finishSessionQuiz({ userId, sessionId });
    expect(result).toMatchObject({ correct: 6, total: 8, multiplier: 1 });
    const after = await findUserStats(db, userId);
    expect(after!.insightBalance - before!.insightBalance).toBe(
      result.insightAwarded,
    );

    // Finishing twice is rejected; the GET now reports it as taken.
    await expect(
      finishSessionQuiz({ userId, sessionId }),
    ).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
    expect((await getSessionQuiz({ userId, sessionId })).submitted).toBe(true);
  });

  it('applies the daily cap to time before the multiplier applies to the award', async () => {
    const userId = await makeUser('cap');
    created.push(userId);
    const deck = await seedDeck(userId, 8);
    for (const card of deck)
      await submitAnswer({ userId, cardId: card.id, rating: 3, elapsedMs: 1 });

    // Already credited all but ten minutes today.
    await db.insert(focusSessions).values({
      userId,
      lootSeed: 'earlier',
      startedAt: new Date(Date.now() - minutes(600)),
      endedAt: new Date(Date.now() - minutes(100)),
      status: 'completed',
      focusedMs: DAILY_CREDITABLE_MS - minutes(10),
      creditedMs: DAILY_CREDITABLE_MS - minutes(10),
    });
    const sessionId = await seedSession(userId, minutes(30));
    const quiz = await getSessionQuiz({ userId, sessionId });
    const byId = new Map(deck.map((c) => [c.id, c.answer]));
    for (const q of quiz.questions) {
      await answerQuizQuestion({
        userId,
        sessionId,
        cardId: q.cardId,
        optionIndex: q.options.indexOf(byId.get(q.cardId)!),
      });
    }
    const outcome = await finishSessionQuiz({ userId, sessionId });
    expect(outcome.multiplier).toBe(2);

    const result = await endSession({ userId, sessionId });
    expect(result.creditedMs).toBe(minutes(10));
    expect(result.cappedByDailyLimit).toBe(true);
    expect(result.quizMultiplier).toBe(2);
    // 10 minutes x 10 Focus x 2, not 30 minutes x 10 x 2.
    expect(result.focusAwarded).toBe(200);

    // The quiz cannot be taken once the session is over.
    await expect(
      finishSessionQuiz({ userId, sessionId }),
    ).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
    expect(
      (await getSessionQuiz({ userId, sessionId })).questions,
    ).toHaveLength(0);
  });

  it('reports due, done, retention, and a seven day forecast', async () => {
    const userId = await makeUser('stats');
    created.push(userId);
    const deck = await seedDeck(userId, 4);
    await submitAnswer({
      userId,
      cardId: deck[0]!.id,
      rating: 3,
      elapsedMs: 1,
    });
    await submitAnswer({
      userId,
      cardId: deck[1]!.id,
      rating: 1,
      elapsedMs: 1,
    });
    const stats = await getReviewStats(userId);
    expect(stats.reviewedToday).toBe(2);
    expect(stats.retention).toBe(0.5);
    expect(stats.forecast).toHaveLength(7);
    expect(stats.forecast[0]!.dayOffset).toBe(0);
    expect(stats.totals.total).toBe(4);
    expect(stats.totals.new).toBe(2);
  });
});

// Exhaustive on purpose: the error class shape is what the routes map to HTTP.
it('review errors are AppErrors', () => {
  expect(new AppError('NOT_FOUND', 'x').status).toBe(404);
});
