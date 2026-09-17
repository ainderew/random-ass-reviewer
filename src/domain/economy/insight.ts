import {
  MAX_QUIZ_MULTIPLIER,
  QUIZ_PASS_THRESHOLD,
} from '@/domain/review/constants';
import { INSIGHT_PER_REVIEW } from './constants';

// A scheduled retrieval attempt earns the same credit for every honest rating.
// The service limits this to one award per card per local day.
export function calculateReviewInsight(): number {
  return INSIGHT_PER_REVIEW;
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
