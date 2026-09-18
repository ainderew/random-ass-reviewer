import { eq } from 'drizzle-orm';
import { db, closeDb } from '@/server/db';
import {
  cards,
  cardReviews,
  focusSessions,
  sessionQuizQuestions,
  mistakeChecks,
  users,
} from '@/server/db/schema';
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
import { getMistakeChecks, answerMistakeCheck } from './mistakes';
import { getTodayPlan } from './today-plan';
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
  expect((await getReviewQueue(userId))[0]!.quiz).toEqual(card.quiz);
  expect((await getReviewQueue(userId))[0]!.source).toEqual({
    id: expect.any(String),
    title: 'Learning test',
  });
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

it('schedules delayed checks, freezes retry results, and clears only a correct delayed answer', async () => {
  const { userId, card } = await setup();
  const empty = await getTodayPlan(userId);
  expect(empty.approved).toBe(0);
  expect(empty.batches[5].total).toBe(0);
  await editCard({ userId, cardId: card.id, reviewStatus: 'approved' });
  expect((await getTodayPlan(userId)).batches[5]).toEqual({
    total: 1,
    returning: 0,
    fresh: 1,
  });
  await answer(userId, card.id, 3);
  const [session] = await db
    .insert(focusSessions)
    .values({ userId, startedAt: new Date(), lootSeed: 'delayed' })
    .returning();
  const input = { userId, sessionId: session!.id };
  const quiz = await getSessionQuiz(input);
  const wrong = quiz.questions[0]!.options.indexOf('Sample B');
  const right = quiz.questions[0]!.options.indexOf('Sample A');
  await answerQuizQuestion({ ...input, cardId: card.id, optionIndex: wrong });
  const checks = await getMistakeChecks(userId);
  expect(checks).toHaveLength(1);
  expect(checks[0]).not.toHaveProperty('correctIndex');
  expect((await getTodayPlan(userId)).mistakesDue).toBe(0);
  const attempt = {
    sessionId: session!.id,
    cardId: card.id,
    attemptId: crypto.randomUUID(),
    optionIndex: wrong,
  };
  await expect(answerMistakeCheck(userId, attempt)).rejects.toMatchObject({
    code: 'INVALID_STATE',
  });
  await db
    .update(sessionQuizQuestions)
    .set({ answeredAt: new Date(Date.now() - 25 * 3600000) })
    .where(eq(sessionQuizQuestions.sessionId, session!.id));
  expect((await getTodayPlan(userId)).mistakesDue).toBe(1);
  const [a, b] = await Promise.all([
    answerMistakeCheck(userId, attempt),
    answerMistakeCheck(userId, attempt),
  ]);
  expect(a).toEqual(b);
  expect(a.correct).toBe(false);
  expect(a.nextDueAt).not.toBeNull();
  const retry = await answerMistakeCheck(userId, {
    ...attempt,
    optionIndex: right,
  });
  expect(retry).toEqual(a);
  expect((await getTodayPlan(userId)).mistakesDue).toBe(0);
  await db
    .update(mistakeChecks)
    .set({ answeredAt: new Date(Date.now() - 25 * 3600000) })
    .where(eq(mistakeChecks.id, attempt.attemptId));
  const correct = await answerMistakeCheck(userId, {
    ...attempt,
    attemptId: crypto.randomUUID(),
    optionIndex: right,
  });
  expect(correct).toMatchObject({ correct: true, nextDueAt: null });
  expect(await getMistakeChecks(userId)).toEqual([]);
  expect((await exportUserData(userId)).mistakeChecks).toHaveLength(2);
});
it('removes edited or unapproved questions from delayed checks and isolates their owner', async () => {
  const { userId, card } = await setup();
  const other = await setup();
  await editCard({ userId, cardId: card.id, reviewStatus: 'approved' });
  await answer(userId, card.id, 3);
  const [session] = await db
    .insert(focusSessions)
    .values({ userId, startedAt: new Date(), lootSeed: 'private-check' })
    .returning();
  const quiz = await getSessionQuiz({ userId, sessionId: session!.id });
  await answerQuizQuestion({
    userId,
    sessionId: session!.id,
    cardId: card.id,
    optionIndex: quiz.questions[0]!.options.indexOf('Sample B'),
  });
  expect(await getMistakeChecks(other.userId)).toEqual([]);
  await expect(
    answerMistakeCheck(other.userId, {
      sessionId: session!.id,
      cardId: card.id,
      attemptId: crypto.randomUUID(),
      optionIndex: 0,
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await editCard({ userId, cardId: card.id, answer: 'An edited answer' });
  expect(await getMistakeChecks(userId)).toEqual([]);
});

it('grades practice choices on the server, snapshots delay, and keeps progress private', async () => {
  const { userId, card } = await setup();
  await editCard({ userId, cardId: card.id, reviewStatus: 'approved' });
  const state = {
    ...initialCardState(Date.now()),
    last_review: new Date(Date.now() - 8 * 86400000).toISOString(),
  };
  await db.update(cards).set({ fsrsState: state }).where(eq(cards.id, card.id));
  await expect(
    submitAnswer({
      userId,
      cardId: card.id,
      rating: 3,
      elapsedMs: 2000,
      practiceType: 'choice',
      selectedAnswer: 'Sample B',
    }),
  ).rejects.toMatchObject({ code: 'VALIDATION' });
  await expect(
    submitAnswer({
      userId,
      cardId: card.id,
      rating: 1,
      elapsedMs: 2000,
      practiceType: 'choice',
      selectedAnswer: 'Not an option',
    }),
  ).rejects.toMatchObject({ code: 'VALIDATION' });
  await submitAnswer({
    userId,
    cardId: card.id,
    rating: 1,
    elapsedMs: 2000,
    practiceType: 'choice',
    selectedAnswer: 'Sample B',
  });
  const { getLearningProgress } = await import('./learning-progress');
  const progress = await getLearningProgress(userId);
  expect(progress.choices).toEqual({ correct: 0, total: 1 });
  expect(progress.delayedChoices).toEqual({ correct: 0, total: 1 });
  expect(progress.subjects[0]!.subject).toBe('hematology');
  const other = await setup();
  expect((await getLearningProgress(other.userId)).choices.total).toBe(0);
  await expect(
    submitAnswer({
      userId,
      cardId: card.id,
      rating: 3,
      elapsedMs: 2000,
      practiceType: 'choice',
      selectedAnswer: 'Sample A',
    }),
  ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  expect((await getLearningProgress(userId)).choices.total).toBe(1);
});
