import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';
import { closeDb, db } from '@/server/db';
import { llmUsage, users } from '@/server/db/schema';
import { ScriptedProvider } from '@/server/llm/__fixtures__/scripted-provider';
import { addUsage } from '@/server/repositories/llm-usage';
import { generateCardsForSource } from './card-generation';
import { monthKey } from './llm-usage';
import { createNoteSource, getNoteDetail } from './notes';
import { createUserWithDefaults } from './user-bootstrap';

const NOTES = `# Cranial nerves

The facial nerve (CN VII) innervates the muscles of facial expression. Damage produces Bell's palsy, a unilateral facial droop.

The trigeminal nerve (CN V) carries sensation from the face and drives the muscles of mastication.`;

const GOOD_CARD = {
  question: 'Which nerve innervates the muscles of facial expression?',
  answer: 'CN VII, the facial nerve.',
  sourceQuote:
    'The facial nerve (CN VII) innervates the muscles of facial expression.',
  difficulty: 'easy',
  tags: ['anatomy'],
};
// Paraphrased. Must be rejected.
const FABRICATED_CARD = {
  question: 'What does CN V do?',
  answer: 'Sensation from the face and mastication.',
  sourceQuote: 'CN V provides facial sensation and controls chewing muscles.',
  difficulty: 'medium',
  tags: ['anatomy'],
};
const BATCH = { cards: [GOOD_CARD, FABRICATED_CARD] };

class FakeProvider extends ScriptedProvider {
  constructor(name: 'anthropic-api' | 'byok' = 'anthropic-api') {
    super([{ output: BATCH }], name);
  }
}

describe('card generation', () => {
  let userId = '';

  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `cards-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
  });

  it('keeps cards whose quote is verbatim, drops the rest, and records usage', async () => {
    const provider = new FakeProvider();
    const created = await createNoteSource({
      userId,
      kind: 'paste',
      title: 'Nerves',
      text: NOTES,
    });
    expect(created.deduplicated).toBe(false);

    const summary = await generateCardsForSource({
      userId,
      sourceId: created.sourceId,
      provider,
    });

    expect(summary).toMatchObject({
      totalChunks: 1,
      cardsCreated: 1,
      rejectedCards: 1,
      failedChunks: 0,
    });
    const detail = await getNoteDetail({ userId, sourceId: created.sourceId });
    expect(detail.cards).toHaveLength(1);
    expect(detail.cards[0]!.sourceQuote).toContain(
      'innervates the muscles of facial expression',
    );
    const usage = await db.query.llmUsage.findFirst({
      where: eq(llmUsage.userId, userId),
    });
    // 900 + 600 cached-write + 0 read, all counted; output separately.
    expect(usage).toMatchObject({ inputTokens: 1500, outputTokens: 300 });
    expect(usage!.costCents).toBeGreaterThan(0);
  });

  it('deduplicates identical content into one source', async () => {
    const again = await createNoteSource({
      userId,
      kind: 'paste',
      title: 'Nerves again',
      text: NOTES,
    });
    expect(again.deduplicated).toBe(true);
  });

  it('stops before calling the provider once the monthly quota is spent', async () => {
    await addUsage(db, {
      userId,
      month: monthKey(),
      inputTokens: 0,
      outputTokens: 0,
      costCents: env.MONTHLY_LLM_QUOTA_CENTS + 1,
    });
    const provider = new FakeProvider();
    const created = await createNoteSource({
      userId,
      kind: 'paste',
      title: 'Over quota',
      text: `${NOTES}\n\nExtra paragraph to change the hash.`,
    });

    const summary = await generateCardsForSource({
      userId,
      sourceId: created.sourceId,
      provider,
    });

    expect(provider.calls).toHaveLength(0);
    expect(summary.failedChunks).toBe(1);
    expect(
      (await getNoteDetail({ userId, sourceId: created.sourceId })).status
        .message,
    ).toMatch(/limit/);
  });

  it('lets BYOK users bypass the quota', async () => {
    const provider = new FakeProvider('byok');
    const created = await createNoteSource({
      userId,
      kind: 'paste',
      title: 'BYOK',
      text: `${NOTES}\n\nAnother variation for a fresh hash.`,
    });

    const summary = await generateCardsForSource({
      userId,
      sourceId: created.sourceId,
      provider,
    });

    expect(provider.calls).toHaveLength(1);
    expect(summary.cardsCreated).toBe(1);
  });
});

describe('card generation, prompt shape and failure isolation', () => {
  let userId = '';

  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `cards-shape-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
  });

  const LONG = Array.from(
    { length: 3 },
    (_, i) =>
      `# Section ${i}\n\n${Array.from({ length: 40 }, (_, j) => `Sentence ${i}-${j} states a fact about topic ${j} in section ${i}.`).join(' ')}`,
  ).join('\n\n');

  it('keeps the system prompt frozen with the cache breakpoint on its last block', async () => {
    const provider = new ScriptedProvider([{ output: { cards: [] } }]);
    const created = await createNoteSource({
      userId,
      kind: 'paste',
      title: 'Shape',
      text: LONG,
    });
    await generateCardsForSource({
      userId,
      sourceId: created.sourceId,
      provider,
    });

    expect(provider.calls.length).toBeGreaterThan(1);
    const systems = provider.calls.map((c) => JSON.stringify(c.system));
    expect(new Set(systems).size).toBe(1);
    const blocks = provider.calls[0]!.system;
    expect(blocks[blocks.length - 1]!.cache).toBe(true);
    for (const call of provider.calls) {
      const userText = (call as { userText: string }).userText;
      expect(userText).toContain('Sentence');
      expect(JSON.stringify(call.system)).not.toContain('Sentence');
    }
  });

  it('isolates one failing chunk and keeps going', async () => {
    const provider = new ScriptedProvider([
      { error: new Error('transient blip') },
      { output: { cards: [] } },
    ]);
    const created = await createNoteSource({
      userId,
      kind: 'paste',
      title: 'Isolation',
      text: `${LONG}\n\nA different tail for a fresh hash.`,
    });
    const summary = await generateCardsForSource({
      userId,
      sourceId: created.sourceId,
      provider,
    });
    expect(summary.failedChunks).toBe(1);
    expect(summary.processedChunks).toBe(summary.totalChunks);
    expect(provider.calls).toHaveLength(summary.totalChunks);
  });

  it('stops after a rate limit or a refusal-shaped validation error', async () => {
    const provider = new ScriptedProvider([
      { error: ScriptedProvider.rateLimited() },
    ]);
    const created = await createNoteSource({
      userId,
      kind: 'paste',
      title: 'Stop',
      text: `${LONG}\n\nAnother tail so the hash differs again.`,
    });
    const summary = await generateCardsForSource({
      userId,
      sourceId: created.sourceId,
      provider,
    });
    expect(provider.calls).toHaveLength(1);
    expect(summary.failedChunks).toBe(1);
    expect(summary.processedChunks).toBe(1);
    const status = (await getNoteDetail({ userId, sourceId: created.sourceId }))
      .status;
    expect(status.message).toMatch(/Busy/);
  });
});

afterAll(() => closeDb());
