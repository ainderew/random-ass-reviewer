import { z } from 'zod';
export interface MistakeCheck {
  sessionId: string;
  cardId: string;
  sourceId: string;
  question: string;
  options: string[];
  dueAt: string;
  ready: boolean;
}
export interface MistakeFeedback {
  correct: boolean;
  correctAnswer: string;
  explanation: string;
  sourceQuote: string;
  nextDueAt: string | null;
}
export const mistakeAnswerSchema = z.object({
  attemptId: z.uuid(),
  sessionId: z.uuid(),
  cardId: z.uuid(),
  optionIndex: z.number().int().min(0).max(9),
});
