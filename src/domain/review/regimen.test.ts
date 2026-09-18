import { recommendedAnswerType } from './regimen';
import type { QueuedCard } from '@/domain/types';
const card: QueuedCard = {
  id: '1',
  question: 'Q',
  answer: 'A',
  sourceQuote: 'A',
  tags: [],
  isNew: true,
  dueAt: new Date(0),
  intervals: { 1: 1, 2: 2, 3: 3, 4: 4 },
  quiz: {
    explanation: 'Because of the source.',
    distractors: ['B', 'C', 'D'].map((text) => ({
      text,
      explanation: 'This is incorrect here.',
    })),
  },
};
it('starts with recall and reconstructs forgotten cards before mixing in recognition', () => {
  expect(recommendedAnswerType(card)).toBe('recall');
  expect(recommendedAnswerType({ ...card, isNew: false, reviewCount: 2 })).toBe(
    'choice',
  );
  expect(recommendedAnswerType({ ...card, isNew: false, reviewCount: 3 })).toBe(
    'recall',
  );
  expect(
    recommendedAnswerType({
      ...card,
      isNew: false,
      reviewCount: 2,
      relearning: true,
    }),
  ).toBe('write');
});
it('honors the saved type and safely falls back for old cards without valid options', () => {
  expect(recommendedAnswerType({ ...card, answerType: 'choice' })).toBe(
    'choice',
  );
  expect(recommendedAnswerType({ ...card, answerType: 'write' })).toBe('write');
  expect(
    recommendedAnswerType({ ...card, answerType: 'choice', quiz: null }),
  ).toBe('recall');
  expect(
    recommendedAnswerType({
      ...card,
      isNew: false,
      reviewCount: 2,
      quiz: null,
    }),
  ).toBe('recall');
});
