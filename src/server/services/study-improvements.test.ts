import { eq } from 'drizzle-orm';
import { db, closeDb } from '@/server/db';
import { cards, cardReviews, focusSessions, users } from '@/server/db/schema';
import { initialCardState } from '@/domain/review/scheduler';
import { insertCards } from '@/server/repositories/card';
import { insertNoteChunks, insertNoteSource } from '@/server/repositories/note';
import { createUserWithDefaults } from './user-bootstrap';
import { editCard } from './cards';
import { getReviewQueue, submitAnswer } from './review';
import { getReviewStats } from './review-stats';
import { getStudyPlan } from './study-plan';
import {
  getSessionQuiz,
  answerQuizQuestion,
  finishSessionQuiz,
} from './session-quiz';
import { updateProfile } from './user-settings';
import { getWorldSignals } from './island';
import { exportUserData } from './user-export';

const created: string[] = [];
afterAll(async () => {
  for (const id of created) await db.delete(users).where(eq(users.id, id));
  await closeDb();
});
async function setup() {
  const user = await createUserWithDefaults({
    id: 'ignored',
    email: `learning-${crypto.randomUUID()}@test.local`,
    emailVerified: null,
  });
  created.push(user.id);
  const source = await insertNoteSource(db, {
    userId: user.id,
    kind: 'paste',
    title: 'Learning test',
    contentHash: user.id,
  });
  const [chunk] = await insertNoteChunks(db, [
    {
      sourceId: source.id,
      ordinal: 0,
      text: 'Sample A meets the criteria. B, C, and D do not.',
      tokenCount: 20,
    },
  ]);
  const [card] = await insertCards(db, [
    {
      userId: user.id,
      chunkId: chunk!.id,
      question: 'Which sample meets the criteria?',
      answer: 'Sample A',
      sourceQuote: 'Sample A meets the criteria.',
      tags: [],
      nextDueAt: new Date(0),
      fsrsState: initialCardState(0),
      subject: 'hematology',
      topic: 'Samples',
      quiz: {
        explanation: 'Sample A meets all the stated criteria.',
        distractors: ['B', 'C', 'D'].map((x) => ({
          text: `Sample ${x}`,
          explanation: `Sample ${x} does not meet the stated criteria.`,
        })),
      },
    },
  ]);
  return { userId: user.id, card: card! };
}
const answer = (userId: string, cardId: string, rating: 1 | 3 = 1) =>
  submitAnswer({ userId, cardId, rating, elapsedMs: 1000 });
it('keeps draft and flagged cards out of study, persists planning, and maps practiced subjects to the island', async () => {
  const { userId, card } = await setup();
  expect(card.reviewStatus).toBe('draft');
  expect(await getReviewQueue(userId)).toEqual([]);
  await expect(answer(userId, card.id)).rejects.toMatchObject({
    code: 'INVALID_STATE',
  });
  expect((await exportUserData(userId)).cards).toHaveLength(1);
  await editCard({ userId, cardId: card.id, reviewStatus: 'approved' });
  await updateProfile(userId, { examMonth: '2027-03', dailyNewCards: 0 });
  expect(await getReviewQueue(userId)).toEqual([]);
  await updateProfile(userId, { dailyNewCards: 5 });
  expect(await getReviewQueue(userId)).toHaveLength(1);
  await answer(userId, card.id);
  expect((await getStudyPlan(userId)).examMonth).toBe('2027-03');
  expect((await getStudyPlan(userId)).subjects).toEqual([
    { subject: 'hematology', total: 1, approved: 1, practiced: 1, topics: 1 },
  ]);
  expect((await getWorldSignals(userId)).distinctSubjects).toEqual([
    'Hematology',
  ]);
  await editCard({ userId, cardId: card.id, reviewStatus: 'flagged' });
  expect((await getReviewStats(userId)).totals.total).toBe(0);
  expect((await getStudyPlan(userId)).subjects[0]!.approved).toBe(0);
});
it('pays Again once and serializes simultaneous reviews without duplicating money or records', async () => {
  const { userId, card } = await setup();
  await editCard({ userId, cardId: card.id, reviewStatus: 'approved' });
  const outcomes = await Promise.allSettled([
    answer(userId, card.id),
    answer(userId, card.id),
  ]);
  expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const success = outcomes.find((r) => r.status === 'fulfilled')!;
  if (success.status === 'fulfilled')
    expect(success.value.insightAwarded).toBe(3);
  const rows = await db
    .select()
    .from(cardReviews)
    .where(eq(cardReviews.cardId, card.id));
  expect(rows).toHaveLength(1);
  await db
    .update(cards)
    .set({ nextDueAt: new Date(0) })
    .where(eq(cards.id, card.id));
  expect((await answer(userId, card.id, 3)).insightAwarded).toBe(0);
});
it('freezes quizzes, gives corrective feedback, separates scores, and preserves the first attempt on retries', async () => {
  const { userId, card } = await setup();
  await editCard({ userId, cardId: card.id, reviewStatus: 'approved' });
  await answer(userId, card.id, 3);
  const [session] = await db
    .insert(focusSessions)
    .values({ userId, startedAt: new Date(), lootSeed: 'quiz' })
    .returning();
  const input = { userId, sessionId: session!.id };
  const quiz = await getSessionQuiz(input);
  expect(quiz.questions).toHaveLength(1);
  expect(quiz.attempts).toEqual({});
  expect(JSON.stringify(quiz)).not.toMatch(
    /correctAnswer|correctIndex|explanation/,
  );
  await editCard({ userId, cardId: card.id, question: 'Updated wording?' });
  expect((await getSessionQuiz(input)).questions).toEqual(quiz.questions);
  const wrong = quiz.questions[0]!.options.indexOf('Sample B');
  const feedback = await answerQuizQuestion({
    ...input,
    cardId: card.id,
    optionIndex: wrong,
  });
  expect(feedback).toMatchObject({
    correct: false,
    correctAnswer: 'Sample A',
    sourceQuote: card.sourceQuote,
  });
  expect(feedback.explanation).toContain('Sample B');
  const retry = await answerQuizQuestion({
    ...input,
    cardId: card.id,
    optionIndex: quiz.questions[0]!.options.indexOf('Sample A'),
  });
  expect(retry).toEqual(feedback);
  expect((await getSessionQuiz(input)).attempts[card.id]).toEqual(feedback);
  expect((await getReviewStats(userId)).retention).toBe(1);
  expect((await getStudyPlan(userId)).mistakes).toEqual([]); // edited card is a draft
  await finishSessionQuiz(input);
  await expect(finishSessionQuiz(input)).rejects.toMatchObject({
    code: 'INVALID_STATE',
  });
});
it('surfaces missed concepts and excludes unreviewed distractors from quizzes', async () => {
  const { userId, card } = await setup();
  await editCard({ userId, cardId: card.id, reviewStatus: 'approved' });
  await answer(userId, card.id, 3);
  const [session] = await db
    .insert(focusSessions)
    .values({ userId, startedAt: new Date(), lootSeed: 'mistake' })
    .returning();
  const input = { userId, sessionId: session!.id };
  const quiz = await getSessionQuiz(input);
  await answerQuizQuestion({
    ...input,
    cardId: card.id,
    optionIndex: quiz.questions[0]!.options.indexOf('Sample C'),
  });
  expect((await getStudyPlan(userId)).mistakes[0]?.cardId).toBe(card.id);
  await editCard({ userId, cardId: card.id, answer: 'A revised answer' });
  const updated = (await exportUserData(userId)).cards[0]!;
  expect(updated.reviewStatus).toBe('draft');
  expect(updated.quiz).toBeNull();
  expect(updated.fsrsState.reps).toBe(0);
});
it('refuses another user editing or inspecting a quiz', async () => {
  const owner = await setup();
  const intruder = await setup();
  await expect(
    editCard({
      userId: intruder.userId,
      cardId: owner.card.id,
      reviewStatus: 'approved',
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  const [session] = await db
    .insert(focusSessions)
    .values({
      userId: owner.userId,
      startedAt: new Date(),
      lootSeed: 'private',
    })
    .returning();
  await expect(
    getSessionQuiz({ userId: intruder.userId, sessionId: session!.id }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
