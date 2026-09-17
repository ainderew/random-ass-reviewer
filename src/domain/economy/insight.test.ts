import { MAX_QUIZ_MULTIPLIER } from '@/domain/review/constants';
import { INSIGHT_PER_REVIEW } from './constants';
import { calculateQuizMultiplier, calculateReviewInsight } from './insight';

describe('calculateReviewInsight', () => {
  it('pays a fixed completion award independent of ratings, difficulty and streaks', () => {
    expect(calculateReviewInsight()).toBe(INSIGHT_PER_REVIEW);
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
