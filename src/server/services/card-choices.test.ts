import { eq } from 'drizzle-orm';
import { closeDb, db } from '@/server/db';
import { cards, users } from '@/server/db/schema';
import { ScriptedProvider } from '@/server/llm/__fixtures__/scripted-provider';
import { makeChoices } from './card-choices';
import { generateCardsForSource } from './card-generation';
import { createNoteSource, getNoteDetail } from './notes';
import { createUserWithDefaults } from './user-bootstrap';

const NOTES = `# Hematology

EDTA is the anticoagulant of choice for a CBC. Sodium citrate is used for coagulation studies.`;

const CARD = {
  question: 'Which anticoagulant is used for a CBC?',
  answer: 'EDTA',
  sourceQuote: 'EDTA is the anticoagulant of choice for a CBC.',
  difficulty: 'easy',
  tags: ['hematology'],
};

const CHOICES = {
  explanation: 'Your notes name EDTA as the anticoagulant for a CBC.',
  distractors: ['Sodium citrate', 'Heparin', 'Sodium fluoride'].map((text) => ({
    text,
    explanation: `Your notes name EDTA, not ${text.toLowerCase()}, for a CBC.`,
  })),
};

describe('makeChoices', () => {
  let userId = '';
  let otherUserId = '';
  let cardId = '';

  beforeAll(async () => {
    const [user, other] = await Promise.all(
      ['choices', 'choices-other'].map((name) =>
        createUserWithDefaults({
          id: 'ignored',
          email: `${name}-${Date.now()}@test.local`,
          emailVerified: null,
        }),
      ),
    );
    userId = user!.id;
    otherUserId = other!.id;
    const { sourceId } = await createNoteSource({
      userId,
      kind: 'paste',
      title: 'Anticoagulants',
      text: NOTES,
    });
    await generateCardsForSource({
      userId,
      sourceId,
      provider: new ScriptedProvider([{ output: { cards: [CARD] } }]),
    });
    cardId = (await getNoteDetail({ userId, sourceId })).cards[0]!.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, otherUserId));
    await closeDb();
  });

  it('refuses choices that repeat the answer and saves nothing', async () => {
    const provider = new ScriptedProvider([
      {
        output: {
          ...CHOICES,
          distractors: [
            { text: 'edta', explanation: 'The same answer in lowercase.' },
            ...CHOICES.distractors.slice(1),
          ],
        },
      },
    ]);
    await expect(
      makeChoices({ userId, cardId, provider }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    const row = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
    expect(row?.quiz).toBeNull();
  });

  it("writes choices from the card's passage and saves them on the card", async () => {
    const provider = new ScriptedProvider([{ output: CHOICES }]);
    const quiz = await makeChoices({ userId, cardId, provider });
    expect(quiz).toEqual(CHOICES);
    const call = provider.calls[0] as { userText: string };
    expect(call.userText).toContain('Correct answer: EDTA');
    expect(call.userText).toContain('Sodium citrate is used for coagulation');
    const row = await db.query.cards.findFirst({ where: eq(cards.id, cardId) });
    expect(row).toMatchObject({ quiz: CHOICES, reviewStatus: 'draft' });
  });

  it('returns existing choices without another model call', async () => {
    const provider = new ScriptedProvider([{ output: CHOICES }]);
    await expect(makeChoices({ userId, cardId, provider })).resolves.toEqual(
      CHOICES,
    );
    expect(provider.calls).toHaveLength(0);
  });

  it("does not touch another student's card", async () => {
    const provider = new ScriptedProvider([{ output: CHOICES }]);
    await expect(
      makeChoices({ userId: otherUserId, cardId, provider }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(provider.calls).toHaveLength(0);
  });
});
