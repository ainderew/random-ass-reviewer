import { MAX_QUIZ_MULTIPLIER } from '@/domain/review/constants';
import {
  INSIGHT_HARD_BONUS,
  INSIGHT_PER_CORRECT,
  INSIGHT_STREAK_BONUS,
} from './constants';
import { calculateQuizMultiplier, calculateReviewInsight } from './insight';

describe('calculateReviewInsight', () => {
  it('pays zero for Again and never negative', () => {
    expect(
      calculateReviewInsight({
        rating: 1,
        difficulty: 'hard',
        consecutiveCorrect: 10,
      }),
    ).toBe(0);
    for (const rating of [1, 2, 3, 4] as const) {
      expect(
        calculateReviewInsight({
          rating,
          difficulty: 'easy',
          consecutiveCorrect: 0,
        }),
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it('pays the base for a correct answer, more for hard cards and every fifth in a row', () => {
    expect(
      calculateReviewInsight({
        rating: 3,
        difficulty: 'easy',
        consecutiveCorrect: 1,
      }),
    ).toBe(INSIGHT_PER_CORRECT);
    expect(
      calculateReviewInsight({
        rating: 2,
        difficulty: 'hard',
        consecutiveCorrect: 1,
      }),
    ).toBe(INSIGHT_PER_CORRECT + INSIGHT_HARD_BONUS);
    expect(
      calculateReviewInsight({
        rating: 4,
        difficulty: 'medium',
        consecutiveCorrect: 5,
      }),
    ).toBe(INSIGHT_PER_CORRECT + INSIGHT_STREAK_BONUS);
  });
});

describe('calculateQuizMultiplier', () => {
  it('is exactly 1.0 below the pass threshold and never lower', () => {
    expect(calculateQuizMultiplier({ correct: 0, total: 8 })).toBe(1);
    expect(calculateQuizMultiplier({ correct: 5, total: 8 })).toBe(1);
    for (let correct = 0; correct <= 8; correct += 1) {
      expect(
        calculateQuizMultiplier({ correct, total: 8 }),
      ).toBeGreaterThanOrEqual(1);
    }
    expect(calculateQuizMultiplier({ correct: 0, total: 0 })).toBe(1);
  });

  it('ramps to the maximum at a perfect score', () => {
    expect(calculateQuizMultiplier({ correct: 8, total: 8 })).toBe(
      MAX_QUIZ_MULTIPLIER,
    );
    const six = calculateQuizMultiplier({ correct: 6, total: 8 });
    const seven = calculateQuizMultiplier({ correct: 7, total: 8 });
    expect(six).toBe(1);
    expect(seven).toBeGreaterThan(1);
    expect(seven).toBeLessThan(MAX_QUIZ_MULTIPLIER);
  });
});
