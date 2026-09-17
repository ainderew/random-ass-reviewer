import { reviewBatch, studyBudget } from './today';
import type { QueuedCard } from '@/domain/types';
const card = (id: string, isNew = false): QueuedCard => ({
  id,
  isNew,
  dueAt: new Date(0),
  question: id,
  answer: '',
  sourceQuote: '',
  tags: [],
  intervals: { 1: 1, 2: 1, 3: 1, 4: 1 },
});
it('keeps a short batch bounded and puts due returning cards ahead of new material', () => {
  const queue = [
    card('new', true),
    ...Array.from({ length: 20 }, (_, i) => card(String(i))),
  ];
  expect(reviewBatch(queue, 5)).toHaveLength(6);
  expect(reviewBatch(queue, 5).every((c) => !c.isNew)).toBe(true);
  expect(reviewBatch(queue, 15)).toHaveLength(18);
  expect(reviewBatch(queue, 30)).toHaveLength(21);
  expect(queue[0]!.id).toBe('new');
  expect(reviewBatch([], 5)).toEqual([]);
});
it('accepts only the three advertised budgets', () => {
  expect(studyBudget('5')).toBe(5);
  expect(studyBudget('15')).toBe(15);
  expect(studyBudget('30')).toBe(30);
  for (const value of [undefined, null, 'abc', 0, 60])
    expect(studyBudget(value)).toBeNull();
});
