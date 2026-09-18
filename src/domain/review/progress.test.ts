import { learningProgress, type ProgressReview } from './progress';
const now = Date.parse('2026-09-18T12:00:00Z');
const row = (patch: Partial<ProgressReview> = {}): ProgressReview => ({
  cardId: 'a',
  reviewedAt: new Date('2026-09-18T01:00:00Z'),
  rating: 3,
  practiceType: 'choice',
  correct: true,
  delayDays: 8,
  subject: 'hematology',
  ...patch,
});
it('keeps empty history empty rather than inventing a zero score', () => {
  const p = learningProgress([], now, 'Asia/Manila');
  expect(p.weeks).toHaveLength(4);
  expect(p.choices.total).toBe(0);
  expect(p.activeDays).toBe(0);
  expect(p.weeks[0]!.start).toBe('2026-08-22');
});
it('scores only first completed reviews per card per local day and separates subjective recall', () => {
  const p = learningProgress(
    [
      row({ correct: false, rating: 1 }),
      row({ reviewedAt: new Date('2026-09-18T02:00:00Z') }),
      row({ cardId: 'b', practiceType: 'write', correct: null }),
      row({ cardId: 'c', practiceType: null, correct: null }),
    ],
    now,
    'UTC',
  );
  expect(p.choices).toEqual({ correct: 0, total: 1 });
  expect(p.delayedChoices).toEqual({ correct: 0, total: 1 });
  expect(p.delayedRecall).toEqual({ correct: 1, total: 1 });
  expect(p.reviews).toBe(4);
  expect(p.subjects[0]!.cards).toBe(1);
});
it('uses local dates, excludes old/future rows, and counts repeated misses across different days', () => {
  const p = learningProgress(
    [
      row({ reviewedAt: new Date('2026-09-16T16:30:00Z'), correct: false }),
      row({ reviewedAt: new Date('2026-09-17T16:30:00Z'), correct: false }),
      row({ reviewedAt: new Date('2026-08-21T15:59:00Z') }),
      row({ reviewedAt: new Date('2026-09-19T00:00:00Z') }),
      row({ cardId: 'b', delayDays: 6.99 }),
    ],
    now,
    'Asia/Manila',
  );
  expect(p.activeDays).toBe(2);
  expect(p.repeatedMisses).toBe(1);
  expect(p.choices).toEqual({ correct: 1, total: 3 });
  expect(p.delayedChoices.total).toBe(2);
});
