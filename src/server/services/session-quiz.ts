import { INSIGHT_PER_QUIZ_CORRECT } from '@/domain/economy/constants';
import { calculateQuizMultiplier } from '@/domain/economy/insight';
import { QUIZ_CARD_COUNT } from '@/domain/review/constants';
import { selectQuizCards } from '@/domain/review/queue';
import { buildQuizQuestion } from '@/domain/review/quiz';
import type { QuizProgress, QuizResult, SessionQuiz } from '@/domain/types';
import { db, type DbOrTx } from '@/server/db';
import { AppError } from '@/server/errors';
import { listSeenCards } from '@/server/repositories/card';
import { claimQuizMultiplier } from '@/server/repositories/focus-session';
import { incrementBalances } from '@/server/repositories/user-stats';
import {
  lockQuizSession,
  readQuiz,
  saveQuiz,
  recordQuizAnswer,
} from '@/server/repositories/quiz';

type Input = { userId: string; sessionId: string };
type QuizRow = Awaited<ReturnType<typeof readQuiz>>[number];

// Caller holds the session row lock. Question wording and keys are frozen once.
async function loadQuiz(tx: DbOrTx, input: Input) {
  const existing = await readQuiz(tx, input.sessionId);
  if (existing.length) return existing;
  const cards = await listSeenCards(tx, input.userId, { limit: 500 });
  const candidates = cards.flatMap((card) => {
    const question = buildQuizQuestion(card, input.sessionId);
    return question ? [{ ...question, id: card.id }] : [];
  });
  return saveQuiz(
    tx,
    input.sessionId,
    selectQuizCards({
      candidates,
      count: QUIZ_CARD_COUNT,
      seed: input.sessionId,
    }),
  );
}
function score(rows: QuizRow[]) {
  return {
    correct: rows.filter((r) => r.correct === true).length,
    total: rows.length,
  };
}
function feedback(row: QuizRow, rows: QuizRow[]): QuizProgress {
  const result = score(rows);
  return {
    cardId: row.cardId,
    correct: row.correct === true,
    correctAnswer: row.snapshot.correctAnswer,
    explanation: row.correct
      ? row.snapshot.explanation
      : `${row.snapshot.optionExplanations[row.optionIndex!]} ${row.snapshot.explanation}`,
    sourceQuote: row.snapshot.sourceQuote,
    correctSoFar: result.correct,
    answered: rows.filter((r) => r.answeredAt).length,
    total: result.total,
    multiplier: calculateQuizMultiplier(result),
  };
}
export async function getSessionQuiz(input: Input): Promise<SessionQuiz> {
  return db.transaction(async (tx) => {
    const session = await lockQuizSession(tx, input.userId, input.sessionId);
    if (!session) throw new AppError('NOT_FOUND', 'Session not found');
    if (session.status !== 'active' || session.quizSubmittedAt) {
      return {
        sessionId: session.id,
        questions: [],
        submitted: true,
        attempts: {},
      };
    }
    const rows = await loadQuiz(tx, input);
    return {
      sessionId: session.id,
      submitted: false,
      questions: rows.map(({ snapshot: { cardId, question, options } }) => ({
        cardId,
        question,
        options,
      })),
      // Only previously submitted answers disclose feedback on reload.
      attempts: Object.fromEntries(
        rows
          .filter((r) => r.answeredAt)
          .map((r) => [r.cardId, feedback(r, rows)]),
      ),
    };
  });
}
export async function answerQuizQuestion(
  input: Input & { cardId: string; optionIndex: number },
): Promise<QuizProgress> {
  return db.transaction(async (tx) => {
    const session = await lockQuizSession(tx, input.userId, input.sessionId);
    if (!session) throw new AppError('NOT_FOUND', 'Session not found');
    if (session.status !== 'active' || session.quizSubmittedAt)
      throw new AppError('INVALID_STATE', 'Quiz already completed');
    const rows = await loadQuiz(tx, input);
    const row = rows.find((q) => q.cardId === input.cardId);
    if (!row) throw new AppError('NOT_FOUND', 'Not in this quiz');
    if (
      !Number.isInteger(input.optionIndex) ||
      input.optionIndex < 0 ||
      input.optionIndex >= row.snapshot.options.length
    )
      throw new AppError('VALIDATION', 'Choose one of the answers.');
    // Retries return the original outcome and can never change the score.
    if (row.answeredAt) return feedback(row, rows);
    row.correct = input.optionIndex === row.snapshot.correctIndex;
    row.optionIndex = input.optionIndex;
    row.answeredAt = new Date();
    await recordQuizAnswer(tx, { ...input, correct: row.correct });
    return feedback(row, rows);
  });
}
export async function finishSessionQuiz(input: Input): Promise<QuizResult> {
  return db.transaction(async (tx) => {
    const session = await lockQuizSession(tx, input.userId, input.sessionId);
    if (!session) throw new AppError('NOT_FOUND', 'Session not found');
    if (session.status !== 'active' || session.quizSubmittedAt)
      throw new AppError('INVALID_STATE', 'Quiz already completed');
    const rows = await loadQuiz(tx, input);
    if (!rows.length)
      throw new AppError('INVALID_STATE', 'No approved quiz questions yet');
    const { correct, total } = score(rows);
    const multiplier = calculateQuizMultiplier({ correct, total });
    const claimed = await claimQuizMultiplier(tx, {
      ...input,
      multiplier,
      correct,
      total,
    });
    if (!claimed) throw new AppError('INVALID_STATE', 'Quiz already submitted');
    const insight = correct * INSIGHT_PER_QUIZ_CORRECT;
    await incrementBalances(tx, input.userId, { insight, xp: insight });
    return { multiplier, insightAwarded: insight, correct, total };
  });
}
