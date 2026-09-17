import type { Card, StoredQuizQuestion } from '@/domain/types';
import { validQuizContent } from '@/domain/study/quiz-content';
import { shuffleWithSeed } from './queue';

export function buildQuizQuestion(
  card: Card,
  seed: string,
): StoredQuizQuestion | null {
  if (
    card.reviewStatus !== 'approved' ||
    !card.quiz ||
    !validQuizContent(card.answer, card.quiz)
  )
    return null;
  const choices = shuffleWithSeed(
    [
      { text: card.answer, explanation: card.quiz.explanation, correct: true },
      ...card.quiz.distractors.map((d) => ({ ...d, correct: false })),
    ],
    `${seed}:${card.id}`,
  );
  return {
    cardId: card.id,
    question: card.question,
    options: choices.map((c) => c.text),
    correctIndex: choices.findIndex((c) => c.correct),
    correctAnswer: card.answer,
    explanation: card.quiz.explanation,
    optionExplanations: choices.map((c) => c.explanation),
    sourceQuote: card.sourceQuote,
  };
}
