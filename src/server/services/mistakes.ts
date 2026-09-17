import type { z } from 'zod';
import type { StoredQuizQuestion } from '@/domain/types';
import {
  mistakeAnswerSchema,
  type MistakeCheck,
  type MistakeFeedback,
} from '@/domain/types/mistakes';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import {
  findMistakeAttempt,
  insertMistakeAttempt,
  listMistakeChecks,
} from '@/server/repositories/mistakes';
import { lockQuizSession } from '@/server/repositories/quiz';

const DAY = 24 * 60 * 60_000;
export async function getMistakeChecks(
  userId: string,
): Promise<MistakeCheck[]> {
  const rows = await listMistakeChecks(db, userId);
  return rows.map(({ snapshot, dueAt, ...row }) => ({
    ...row,
    question: snapshot.question,
    options: snapshot.options,
    dueAt: new Date(dueAt).toISOString(),
    ready: new Date(dueAt).getTime() <= Date.now(),
  }));
}
function feedback(
  snapshot: StoredQuizQuestion,
  attempt: { correct: boolean; optionIndex: number; answeredAt: Date },
): MistakeFeedback {
  return {
    correct: attempt.correct,
    correctAnswer: snapshot.correctAnswer,
    explanation: attempt.correct
      ? snapshot.explanation
      : `${snapshot.optionExplanations[attempt.optionIndex]} ${snapshot.explanation}`,
    sourceQuote: snapshot.sourceQuote,
    nextDueAt: attempt.correct
      ? null
      : new Date(attempt.answeredAt.getTime() + DAY).toISOString(),
  };
}
export async function answerMistakeCheck(
  userId: string,
  request: z.infer<typeof mistakeAnswerSchema>,
): Promise<MistakeFeedback> {
  const input = mistakeAnswerSchema.parse(request);
  return db.transaction(async (tx) => {
    // Serializes submissions for this original quiz, including concurrent retries.
    if (!(await lockQuizSession(tx, userId, input.sessionId)))
      throw new AppError('NOT_FOUND', 'Question not found');
    const previous = await findMistakeAttempt(tx, input.attemptId, userId);
    if (previous) {
      if (
        previous.attempt.sessionId !== input.sessionId ||
        previous.attempt.cardId !== input.cardId
      )
        throw new AppError('VALIDATION', 'Attempt belongs to another question');
      return feedback(previous.snapshot, previous.attempt);
    }
    const [row] = await listMistakeChecks(tx, userId, input);
    if (!row)
      throw new AppError(
        'INVALID_STATE',
        'This question no longer needs a check. Refresh your plan.',
      );
    if (new Date(row.dueAt).getTime() > Date.now())
      throw new AppError('INVALID_STATE', 'This check is scheduled for later.');
    if (input.optionIndex >= row.snapshot.options.length)
      throw new AppError('VALIDATION', 'Choose one of the answers');
    const attempt = await insertMistakeAttempt(tx, {
      id: input.attemptId,
      sessionId: input.sessionId,
      cardId: input.cardId,
      optionIndex: input.optionIndex,
      correct: input.optionIndex === row.snapshot.correctIndex,
    });
    return feedback(row.snapshot, attempt);
  });
}
