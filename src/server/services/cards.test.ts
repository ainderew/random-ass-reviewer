import { eq } from 'drizzle-orm';
import { initialCardState } from '@/domain/review/scheduler';
import { closeDb, db } from '@/server/db';
import { cards, users } from '@/server/db/schema';
import { insertCards } from '@/server/repositories/card';
import { insertNoteChunks, insertNoteSource } from '@/server/repositories/note';
import { editCard, removeCard } from './cards';
import { createUserWithDefaults } from './user-bootstrap';

describe('card editing', () => {
  let userId = '';
  let intruder = '';
  beforeAll(async () => {
    const [a, b] = await Promise.all(
      ['owner', 'intruder'].map((tag) =>
        createUserWithDefaults({
          id: 'ignored',
          email: `${tag}-cards-${Date.now()}@test.local`,
          emailVerified: null,
        }),
      ),
    );
    userId = a!.id;
    intruder = b!.id;
  });
  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, intruder));
    await closeDb();
  });

  it("edits and deletes only the owner's cards", async () => {
    const source = await insertNoteSource(db, {
      userId,
      kind: 'paste',
      title: 'c',
      contentHash: `c-${userId}`,
    });
    const [chunk] = await insertNoteChunks(db, [
      { sourceId: source.id, ordinal: 0, text: 'body', tokenCount: 1 },
    ]);
    const [card] = await insertCards(db, [
      {
        userId,
        chunkId: chunk!.id,
        question: 'q',
        answer: 'a',
        sourceQuote: 'body',
        tags: [],
        nextDueAt: new Date(),
        fsrsState: initialCardState(Date.now()),
      },
    ]);

    await expect(
      editCard({
        userId: intruder,
        cardId: card!.id,
        question: 'x',
        answer: 'y',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const edited = await editCard({
      userId,
      cardId: card!.id,
      question: 'Better?',
      answer: 'Yes.',
    });
    expect(edited).toMatchObject({
      question: 'Better?',
      answer: 'Yes.',
      sourceQuote: 'body',
    });

    await expect(
      removeCard({ userId: intruder, cardId: card!.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await removeCard({ userId, cardId: card!.id });
    expect(
      await db.query.cards.findFirst({ where: eq(cards.id, card!.id) }),
    ).toBeUndefined();
    await expect(
      removeCard({ userId, cardId: card!.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
