import { cardBatchSchema } from '@/domain/study/card-schema';
import { quoteAppearsInSource } from '@/domain/study/verify-quote';
import { cardsFromPassage, FakeLlmProvider } from './fake-provider';

const PASSAGE =
  "# Notes\n\nThe facial nerve (CN VII) innervates the muscles of facial expression. Damage produces Bell's palsy, a unilateral facial droop. The trigeminal nerve carries sensation from the face.";

describe('FakeLlmProvider', () => {
  it('refuses to be constructed in production', () => {
    expect(() => new FakeLlmProvider('production')).toThrow(
      /not be constructed in production/,
    );
  });

  it('makes cards whose quotes pass the verbatim guard', async () => {
    const provider = new FakeLlmProvider('test');
    const { data, usage } = await provider.generateStructured({
      system: [],
      userText: `Passage:\n\n${PASSAGE}`,
      schema: cardBatchSchema,
      model: 'x',
      maxTokens: 10,
    });
    expect(data.cards.length).toBeGreaterThan(0);
    for (const card of data.cards)
      expect(quoteAppearsInSource(card.sourceQuote, PASSAGE)).toBe(true);
    expect(usage.inputTokens).toBe(0);
    expect(cardsFromPassage('short')).toEqual([]);
  });
});
