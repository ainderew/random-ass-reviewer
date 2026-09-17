import { buildQuizQuestion } from './quiz';
import { initialCardState } from './scheduler';
import type { Card } from '@/domain/types';
const card: Card = {
  id: 'card',
  userId: 'u',
  chunkId: 'c',
  question: 'Which sample?',
  answer: 'A',
  sourceQuote: 'The source states A.',
  tags: [],
  nextDueAt: new Date(),
  fsrsState: initialCardState(0),
  suspended: false,
  reviewStatus: 'approved',
  subject: 'hematology',
  topic: 'Samples',
  quiz: {
    explanation: 'A meets the sample requirements.',
    distractors: ['B', 'C', 'D'].map((text) => ({
      text,
      explanation: `${text} does not meet the requirements.`,
    })),
  },
};
it('keeps authored choices paired with explanations through deterministic shuffling', () => {
  const quiz = buildQuizQuestion(card, 'session')!;
  expect(buildQuizQuestion(card, 'session')).toEqual(quiz);
  expect(quiz.options[quiz.correctIndex]).toBe('A');
  for (const [index, choice] of quiz.options.entries())
    expect(quiz.optionExplanations[index]).toContain(choice);
});
it('does not invent distractors for legacy cards or allow unapproved or duplicate choices', () => {
  expect(buildQuizQuestion({ ...card, quiz: null }, 's')).toBeNull();
  expect(buildQuizQuestion({ ...card, reviewStatus: 'draft' }, 's')).toBeNull();
  expect(
    buildQuizQuestion(
      {
        ...card,
        quiz: {
          ...card.quiz!,
          distractors: [
            { text: ' a ', explanation: 'This is the same answer.' },
            ...card.quiz!.distractors.slice(1),
          ],
        },
      },
      's',
    ),
  ).toBeNull();
});
