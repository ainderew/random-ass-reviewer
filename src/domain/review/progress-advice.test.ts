import { learningProgress, type ProgressReview } from './progress';
import { progressAdvice } from './progress-advice';
const now = Date.parse('2026-09-19T12:00:00Z');
const make = (
  subject: string,
  correct: boolean,
  cardId: string,
  day = 19,
): ProgressReview => ({
  subject,
  correct,
  cardId,
  reviewedAt: new Date(`2026-09-${day}T01:00:00Z`),
  practiceType: 'choice',
  rating: correct ? 3 : 1,
  delayDays: 8,
});
it('shows every subject without inventing scores or weakness for empty history', () => {
  const advice = progressAdvice(learningProgress([], now, 'UTC'));
  expect(advice).toHaveLength(6);
  expect(
    advice.every((s) => s.status === 'untracked' && s.choices.total === 0),
  ).toBe(true);
});
it('does not rank repeated practice on one card or a tiny sample as a weak subject', () => {
  const rows = [19, 18, 17, 16, 15].map((day) =>
    make('hematology', false, 'one', day),
  );
  rows.push(make('clinical-chemistry', false, 'two'));
  const advice = progressAdvice(learningProgress(rows, now, 'UTC'));
  expect(advice.filter((s) => s.status === 'focus')).toHaveLength(0);
  expect(advice.find((s) => s.id === 'hematology')?.status).toBe('limited');
});
it('prioritizes lower accuracy only with enough distinct cards and keeps delayed evidence separate', () => {
  const rows = Array.from({ length: 5 }, (_, i) =>
    make('hematology', i === 0, `h${i}`),
  );
  rows.push(
    ...Array.from({ length: 5 }, (_, i) => ({
      ...make('clinical-chemistry', i < 4, `c${i}`),
      delayDays: 2,
    })),
  );
  rows.push(
    ...Array.from({ length: 5 }, (_, i) =>
      make('clinical-microscopy', true, `m${i}`),
    ),
  );
  const advice = progressAdvice(learningProgress(rows, now, 'UTC'));
  expect(advice.slice(0, 2).map((s) => s.id)).toEqual([
    'hematology',
    'clinical-chemistry',
  ]);
  expect(advice[0]?.delayed).toEqual({ correct: 1, total: 5 });
  expect(advice[1]?.delayed.total).toBe(0);
  expect(advice.find((s) => s.id === 'clinical-microscopy')?.status).toBe(
    'extend',
  );
});
