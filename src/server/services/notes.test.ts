import { eq } from 'drizzle-orm';
import { closeDb, db } from '@/server/db';
import { cards, noteChunks, users } from '@/server/db/schema';
import { ScriptedProvider } from '@/server/llm/__fixtures__/scripted-provider';
import { generateCardsForSource } from './card-generation';
import {
  createNoteSource,
  getNoteDetail,
  listNotes,
  removeNote,
  retryGeneration,
} from './notes';
import { createUserWithDefaults } from './user-bootstrap';

const TEXT =
  'The facial nerve (CN VII) innervates the muscles of facial expression. Damage produces a droop.';
const CARD = {
  question: 'Which nerve innervates the muscles of facial expression?',
  answer: 'CN VII.',
  sourceQuote:
    'The facial nerve (CN VII) innervates the muscles of facial expression.',
  difficulty: 'easy',
  tags: ['anatomy'],
};

describe('notes service', () => {
  let userId = '';
  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `notes-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
  });
  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await closeDb();
  });

  it('refuses empty text and unknown ids', async () => {
    await expect(
      createNoteSource({ userId, kind: 'paste', title: 'x', text: '   \n  ' }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(
      getNoteDetail({
        userId,
        sourceId: '00000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      removeNote({ userId, sourceId: '00000000-0000-4000-8000-000000000000' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('lists sources with their counts, retries only empty chunks, and deletes with cascade', async () => {
    const created = await createNoteSource({
      userId,
      kind: 'paste',
      title: 'Nerves',
      text: TEXT,
    });
    let list = await listNotes(userId);
    expect(list).toEqual([
      expect.objectContaining({
        id: created.sourceId,
        chunkCount: 1,
        cardCount: 0,
      }),
    ]);

    // First pass fails; the retry fills the empty chunk; a third pass does nothing.
    const failing = new ScriptedProvider([{ error: new Error('blip') }]);
    await generateCardsForSource({
      userId,
      sourceId: created.sourceId,
      provider: failing,
    });
    const working = new ScriptedProvider([{ output: { cards: [CARD] } }]);
    await retryGeneration({
      userId,
      sourceId: created.sourceId,
      provider: working,
    });
    expect(working.calls).toHaveLength(1);
    const again = new ScriptedProvider([{ output: { cards: [CARD] } }]);
    await retryGeneration({
      userId,
      sourceId: created.sourceId,
      provider: again,
    });
    expect(again.calls).toHaveLength(0);

    list = await listNotes(userId);
    expect(list[0]).toMatchObject({ cardCount: 1 });
    const detail = await getNoteDetail({ userId, sourceId: created.sourceId });
    expect(detail.cards).toHaveLength(1);
    expect(detail.status.finished).toBe(true);

    await removeNote({ userId, sourceId: created.sourceId });
    expect(
      await db.query.noteChunks.findFirst({
        where: eq(noteChunks.sourceId, created.sourceId),
      }),
    ).toBeUndefined();
    expect(
      await db.query.cards.findFirst({ where: eq(cards.userId, userId) }),
    ).toBeUndefined();
    expect(await listNotes(userId)).toEqual([]);
  });
});
