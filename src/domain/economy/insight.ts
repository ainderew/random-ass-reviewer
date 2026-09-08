import type { Rating } from '@/domain/types';
import {
  MAX_QUIZ_MULTIPLIER,
  QUIZ_PASS_THRESHOLD,
} from '@/domain/review/constants';
import {
  INSIGHT_HARD_BONUS,
  INSIGHT_PER_CORRECT,
  INSIGHT_STREAK_BONUS,
  INSIGHT_STREAK_BONUS_AT,
} from './constants';

export type CardDifficulty = 'easy' | 'medium' | 'hard';

// Insight pays for recall and nothing else. Again pays zero: never negative,
// never a deduction.
export function calculateReviewInsight(input: {
  rating: Rating;
  difficulty: CardDifficulty;
  consecutiveCorrect: number;
}): number {
  if (input.rating === 1) return 0;
  let insight = INSIGHT_PER_CORRECT;
  if (input.difficulty === 'hard') insight += INSIGHT_HARD_BONUS;
  if (
    input.consecutiveCorrect > 0 &&
    input.consecutiveCorrect % INSIGHT_STREAK_BONUS_AT === 0
  ) {
    insight += INSIGHT_STREAK_BONUS;
  }
  return insight;
}

// 1.0 below the pass threshold, then a straight ramp to the maximum at 100%.
// The floor is the no-punishment rule: trying the quiz can never cost you.
export function calculateQuizMultiplier(input: {
  correct: number;
  total: number;
}): number {
  if (input.total <= 0) return 1;
  const ratio = Math.min(1, Math.max(0, input.correct / input.total));
  if (ratio < QUIZ_PASS_THRESHOLD) return 1;
  const ramp = (ratio - QUIZ_PASS_THRESHOLD) / (1 - QUIZ_PASS_THRESHOLD);
  const multiplier = 1 + ramp * (MAX_QUIZ_MULTIPLIER - 1);
  return Math.max(1, Math.round(multiplier * 100) / 100);
}
