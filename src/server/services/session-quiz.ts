import { INSIGHT_PER_QUIZ_CORRECT } from '@/domain/economy/constants';
import { calculateQuizMultiplier } from '@/domain/economy/insight';
import { QUIZ_CARD_COUNT, QUIZ_OPTION_COUNT } from '@/domain/review/constants';
import { selectQuizCards, shuffleWithSeed } from '@/domain/review/queue';
import type {
  Card,
  CardReview,
  FocusSession,
  QuizProgress,
  QuizQuestion,
  QuizResult,
  SessionQuiz,
} from '@/domain/types';
import { db, type DbOrTx } from '@/server/db';
import { AppError } from '@/server/errors';
import {
  insertCardReview,
  listReviewsForSession,
  listSeenCards,
  listUserCards,
} from '@/server/repositories/card';
import {
  claimQuizMultiplier,
  findSessionById,
} from '@/server/repositories/focus-session';
import { incrementBalances } from '@/server/repositories/user-stats';

interface KeyedQuestion extends QuizQuestion {
  correctIndex: number;
}

const norm = (s: string) => s.trim().toLowerCase();

// Built deterministically from the session id, so every request agrees
// without the server storing a quiz. The key never leaves this module.
async function buildQuiz(
  tx: DbOrTx,
  input: { userId: string; sessionId: string },
): Promise<KeyedQuestion[]> {
  const [candidates, pool] = await Promise.all([
    listSeenCards(tx, input.userId, { limit: 500 }),
    listUserCards(tx, input.userId, { limit: 500 }),
  ]);
  const chosen = selectQuizCards({
    candidates,
    count: QUIZ_CARD_COUNT,
    seed: input.sessionId,
  });
  return chosen.map((card) => toQuestion(card, pool, input.sessionId));
}

// Distractors are other cards' answers: plausible, and free.
function toQuestion(
  card: Card,
  pool: Card[],
  sessionId: string,
): KeyedQuestion {
  const others = pool
    .filter((c) => c.id !== card.id && norm(c.answer) !== norm(card.answer))
    .map((c) => c.answer);
  const unique = [...new Map(others.map((a) => [norm(a), a])).values()];
  const distractors = shuffleWithSeed(
    unique,
    `${sessionId}:${card.id}:d`,
  ).slice(0, QUIZ_OPTION_COUNT - 1);
  const options = shuffleWithSeed(
    [card.answer, ...distractors],
    `${sessionId}:${card.id}:o`,
  );
  return {
    cardId: card.id,
    question: card.question,
    options,
    correctIndex: options.indexOf(card.answer),
  };
}

const strip = ({ cardId, question, options }: KeyedQuestion): QuizQuestion => ({
  cardId,
  question,
  options,
});

async function loadOpenSession(
  tx: DbOrTx,
  input: { userId: string; sessionId: string },
): Promise<FocusSession> {
  const session = await findSessionById(tx, input.sessionId);
  if (!session || session.userId !== input.userId) {
    throw new AppError('NOT_FOUND', 'Session not found');
  }
  if (session.status !== 'active') {
    throw new AppError('INVALID_STATE', 'Session already completed');
  }
  if (session.quizSubmittedAt) {
    throw new AppError('INVALID_STATE', 'Quiz already submitted');
  }
  return session;
}

// First attempt per card wins. Rating 3 marks a correct pick, 1 a miss.
function tally(quiz: KeyedQuestion[], reviews: CardReview[]) {
  const first = new Map<string, CardReview>();
  for (const review of reviews) {
    if (!first.has(review.cardId)) first.set(review.cardId, review);
  }
  const answered = quiz.filter((q) => first.has(q.cardId));
  const correct = answered.filter(
    (q) => first.get(q.cardId)!.rating >= 3,
  ).length;
  return { answered: answered.length, correct, first };
}

export async function getSessionQuiz(input: {
  userId: string;
  sessionId: string;
}): Promise<SessionQuiz> {
  const session = await findSessionById(db, input.sessionId);
  if (!session || session.userId !== input.userId) {
    throw new AppError('NOT_FOUND', 'Session not found');
  }
  if (session.status !== 'active' || session.quizSubmittedAt) {
    return { sessionId: session.id, questions: [], submitted: true };
  }
  const quiz = await buildQuiz(db, input);
  return {
    sessionId: session.id,
    questions: quiz.map(strip),
    submitted: false,
  };
}

// Graded here, by index, against a key the client never saw. The row it
// writes is the attempt record; a second answer for the same card is refused.
export async function answerQuizQuestion(input: {
  userId: string;
  sessionId: string;
  cardId: string;
  optionIndex: number;
}): Promise<QuizProgress> {
  return db.transaction(async (tx) => {
    const session = await loadOpenSession(tx, input);
    const quiz = await buildQuiz(tx, input);
    const question = quiz.find((q) => q.cardId === input.cardId);
    if (!question) throw new AppError('NOT_FOUND', 'Not in this quiz');

    const before = tally(quiz, await listReviewsForSession(tx, session.id));
    if (before.first.has(question.cardId)) {
      throw new AppError('INVALID_STATE', 'Already answered');
    }
    const correct = input.optionIndex === question.correctIndex;
    await insertCardReview(tx, {
      cardId: question.cardId,
      sessionId: session.id,
      rating: correct ? 3 : 1,
      elapsedMs: 0,
    });
    const correctSoFar = before.correct + (correct ? 1 : 0);
    return {
      correct,
      correctSoFar,
      answered: before.answered + 1,
      total: quiz.length,
      multiplier: calculateQuizMultiplier({
        correct: correctSoFar,
        total: quiz.length,
      }),
    };
  });
}

// Written once: the conditional update in claimQuizMultiplier is the only
// lock. Unanswered questions count as wrong.
export async function finishSessionQuiz(input: {
  userId: string;
  sessionId: string;
}): Promise<QuizResult> {
  return db.transaction(async (tx) => {
    const session = await loadOpenSession(tx, input);
    const quiz = await buildQuiz(tx, input);
    if (quiz.length === 0) {
      throw new AppError('INVALID_STATE', 'No quiz for this session');
    }
    const { correct } = tally(
      quiz,
      await listReviewsForSession(tx, session.id),
    );
    const multiplier = calculateQuizMultiplier({ correct, total: quiz.length });

    const claimed = await claimQuizMultiplier(tx, {
      sessionId: session.id,
      userId: input.userId,
      multiplier,
      correct,
      total: quiz.length,
    });
    if (!claimed) throw new AppError('INVALID_STATE', 'Quiz already submitted');

    const insight = correct * INSIGHT_PER_QUIZ_CORRECT;
    await incrementBalances(tx, input.userId, { insight, xp: insight });
    return { multiplier, insightAwarded: insight, correct, total: quiz.length };
  });
}
