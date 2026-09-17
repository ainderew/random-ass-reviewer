import { and, asc, eq, isNull } from 'drizzle-orm';
import type { StoredQuizQuestion } from '@/domain/types/review';
import type { DbOrTx } from '@/server/db';
import { focusSessions, sessionQuizQuestions } from '@/server/db/schema';

export async function lockQuizSession(
  tx: DbOrTx,
  userId: string,
  sessionId: string,
) {
  const [row] = await tx
    .select()
    .from(focusSessions)
    .where(
      and(eq(focusSessions.id, sessionId), eq(focusSessions.userId, userId)),
    )
    .for('update');
  return row ?? null;
}
export async function readQuiz(tx: DbOrTx, sessionId: string) {
  return tx
    .select()
    .from(sessionQuizQuestions)
    .where(eq(sessionQuizQuestions.sessionId, sessionId))
    .orderBy(asc(sessionQuizQuestions.ordinal));
}
export async function saveQuiz(
  tx: DbOrTx,
  sessionId: string,
  questions: StoredQuizQuestion[],
) {
  if (questions.length)
    await tx
      .insert(sessionQuizQuestions)
      .values(
        questions.map((snapshot, ordinal) => ({
          sessionId,
          cardId: snapshot.cardId,
          ordinal,
          snapshot,
        })),
      );
  return readQuiz(tx, sessionId);
}
export async function recordQuizAnswer(
  tx: DbOrTx,
  input: {
    sessionId: string;
    cardId: string;
    optionIndex: number;
    correct: boolean;
  },
) {
  await tx
    .update(sessionQuizQuestions)
    .set({
      optionIndex: input.optionIndex,
      correct: input.correct,
      answeredAt: new Date(),
    })
    .where(
      and(
        eq(sessionQuizQuestions.sessionId, input.sessionId),
        eq(sessionQuizQuestions.cardId, input.cardId),
        isNull(sessionQuizQuestions.answeredAt),
      ),
    );
}

export async function exportQuizAttempts(tx: DbOrTx, userId: string) {
  return tx
    .select({ question: sessionQuizQuestions })
    .from(sessionQuizQuestions)
    .innerJoin(
      focusSessions,
      eq(focusSessions.id, sessionQuizQuestions.sessionId),
    )
    .where(eq(focusSessions.userId, userId));
}
