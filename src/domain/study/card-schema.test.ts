import {
  acceptCard,
  cardBatchSchema,
  generatedCardSchema,
  QUESTION_MAX,
  transcriptionSchema,
} from './card-schema';

const good = {
  question: 'Which nerve innervates the muscles of facial expression?',
  answer: 'CN VII, the facial nerve.',
  sourceQuote:
    'The facial nerve (CN VII) innervates the muscles of facial expression.',
  difficulty: 'easy',
  tags: ['anatomy'],
};

describe('acceptCard', () => {
  const candidate = cardBatchSchema.parse({ cards: [good] }).cards[0]!;
  const wrong = { text: 'Heparin', explanation: 'Too short' };

  it('keeps a good card and defaults its type to recall', () => {
    expect(acceptCard(candidate)).toMatchObject({ questionType: 'recall' });
  });

  it('fits a board-style case that a one-line limit would have cut', () => {
    const question = 'A 54-year-old man '.repeat(25);
    expect(question.length).toBeGreaterThan(300);
    expect(acceptCard({ ...candidate, question })?.question).toBe(question);
  });

  it('refuses a card whose question or quote is unusable', () => {
    const long = 'x'.repeat(QUESTION_MAX + 1);
    expect(acceptCard({ ...candidate, question: long })).toBeNull();
    expect(acceptCard({ ...candidate, sourceQuote: 'CN VII' })).toBeNull();
  });

  it('repairs what is not worth losing the question over', () => {
    const repaired = acceptCard({
      ...candidate,
      topic: 'y'.repeat(150),
      tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'.repeat(40)],
      quiz: { explanation: 'Bone', distractors: [wrong] },
    });
    expect(repaired).toMatchObject({ quiz: null });
    expect(repaired?.tags).toHaveLength(5);
    expect(repaired?.topic).toHaveLength(100);
  });
});

describe('generated card schema', () => {
  it('accepts a well-formed card', () => {
    expect(generatedCardSchema.safeParse(good).success).toBe(true);
  });

  it('rejects a quote too short to verify, an unknown difficulty, or too many tags', () => {
    expect(
      generatedCardSchema.safeParse({ ...good, sourceQuote: 'CN VII' }).success,
    ).toBe(false);
    expect(
      generatedCardSchema.safeParse({ ...good, difficulty: 'brutal' }).success,
    ).toBe(false);
    expect(
      generatedCardSchema.safeParse({
        ...good,
        tags: ['a', 'b', 'c', 'd', 'e', 'f'],
      }).success,
    ).toBe(false);
  });

  it('takes a batch of any size, and an empty one', () => {
    expect(cardBatchSchema.safeParse({ cards: [] }).data?.unanswered).toBe(0);
    expect(
      cardBatchSchema.safeParse({ cards: Array(40).fill(good) }).success,
    ).toBe(true);
  });

  it('does not fail a batch over one card that breaks a limit', () => {
    const long = { ...good, question: 'x'.repeat(QUESTION_MAX + 1) };
    expect(cardBatchSchema.safeParse({ cards: [good, long] }).success).toBe(
      true,
    );
  });

  it('transcription is a single text field', () => {
    expect(transcriptionSchema.parse({ text: '' })).toEqual({ text: '' });
  });
});
