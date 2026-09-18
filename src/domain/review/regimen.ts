import { z } from 'zod';
import type { QueuedCard } from '@/domain/types';
import { validQuizContent } from '@/domain/study/quiz-content';
export const answerTypeSchema = z.enum(['auto', 'recall', 'write', 'choice']);
export type AnswerType = z.infer<typeof answerTypeSchema>;
export type PracticeType = Exclude<AnswerType, 'auto'>;
export function hasChoices(card: QueuedCard): boolean {
  return !!card.quiz && validQuizContent(card.answer, card.quiz);
}
// A product heuristic, not a clinically validated formula: recall first,
// reconstruct recently forgotten answers, periodically practise recognition.
export function recommendedAnswerType(card: QueuedCard): PracticeType {
  if (card.answerType && card.answerType !== 'auto')
    return card.answerType === 'choice' && !hasChoices(card)
      ? 'recall'
      : card.answerType;
  if (card.isNew) return 'recall';
  if (card.relearning) return 'write';
  if ((card.reviewCount ?? 0) % 3 === 2 && hasChoices(card)) return 'choice';
  return 'recall';
}
