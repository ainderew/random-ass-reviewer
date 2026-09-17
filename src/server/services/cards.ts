import type { Card, UpdateCardRequest } from '@/domain/types';
import { initialCardState } from '@/domain/review/scheduler';
import { validQuizContent } from '@/domain/study/quiz-content';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import {
  deleteCard,
  lockCard,
  updateCardText,
  updateCardSchedule,
} from '@/server/repositories/card';

export async function editCard(
  input: UpdateCardRequest & { userId: string; cardId: string },
): Promise<Card> {
  return db.transaction(async (tx) => {
    const current = await lockCard(tx, input.userId, input.cardId);
    if (!current) throw new AppError('NOT_FOUND', 'Card not found');
    const patch = { ...input };
    const contentChanged =
      (input.question !== undefined && input.question !== current.question) ||
      (input.answer !== undefined && input.answer !== current.answer);
    // Existing explanations and choices are stale after a question/answer edit.
    if (contentChanged && input.quiz === undefined) patch.quiz = null;
    if (contentChanged || input.quiz !== undefined)
      patch.reviewStatus = input.reviewStatus ?? 'draft';
    const next = { ...current, ...patch };
    if (next.quiz && !validQuizContent(next.answer, next.quiz)) {
      throw new AppError(
        'VALIDATION',
        'Quiz choices must be distinct, with three explained alternatives.',
      );
    }
    if (Object.keys(input).length <= 2) return current;
    const card = await updateCardText(tx, patch);
    if (!card) throw new AppError('NOT_FOUND', 'Card not found');
    if (contentChanged) {
      const now = new Date();
      const reset = await updateCardSchedule(tx, card.id, {
        nextDueAt: now,
        fsrsState: initialCardState(now.getTime()),
      });
      if (reset) return reset;
    }
    return card;
  });
}
export async function removeCard(input: {
  userId: string;
  cardId: string;
}): Promise<void> {
  if (!(await deleteCard(db, input)))
    throw new AppError('NOT_FOUND', 'Card not found');
}
