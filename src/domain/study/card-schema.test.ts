import {
  cardBatchSchema,
  generatedCardSchema,
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

  it('caps a batch at twelve cards and allows an empty one', () => {
    expect(cardBatchSchema.safeParse({ cards: [] }).success).toBe(true);
    expect(
      cardBatchSchema.safeParse({ cards: Array(13).fill(good) }).success,
    ).toBe(false);
  });

  it('transcription is a single text field', () => {
    expect(transcriptionSchema.parse({ text: '' })).toEqual({ text: '' });
  });
});
