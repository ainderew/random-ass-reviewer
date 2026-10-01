import { eq } from 'drizzle-orm';
import { HEARTBEAT_INTERVAL_MS } from '@/domain/session/constants';
import { closeDb, db } from '@/server/db';
import {
  focusSessions,
  pets,
  sessionHeartbeats,
  users,
} from '@/server/db/schema';
import { AppError } from '@/server/errors';
import { endSession } from './end-session';
import { careForPet, getPet, updatePet } from './pet';
import { createUserWithDefaults } from './user-bootstrap';

// The kibble guard and the happiness formula live in SQL. Mocking the
// database would test nothing.

const MIN = 60_000;
const H = 60 * MIN;
const created: string[] = [];

async function makeUser(): Promise<string> {
  const user = await createUserWithDefaults({
    id: 'ignored',
    email: `pet-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
    emailVerified: null,
  });
  created.push(user.id);
  return user.id;
}

// A finished session with credited focus, and optionally a quiz score.
async function credit(
  userId: string,
  creditedMs: number,
  quiz?: { correct: number; total: number },
) {
  await db.insert(focusSessions).values({
    userId,
    lootSeed: 'seed',
    startedAt: new Date(Date.now() - creditedMs - MIN),
    endedAt: new Date(),
    status: 'completed',
    focusedMs: creditedMs,
    creditedMs,
    ...(quiz ? { quizCorrect: quiz.correct, quizTotal: quiz.total } : {}),
  });
}

const failsWith = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toBeInstanceOf(AppError);
  await expect(p).rejects.toMatchObject({ code });
};

afterAll(async () => {
  for (const id of created) await db.delete(users).where(eq(users.id, id));
  await closeDb();
});

describe('the study cat', () => {
  it('appears the first time she is asked for: slim, content, nothing earned', async () => {
    const userId = await makeUser();
    const pet = await getPet(userId);
    expect(pet).toMatchObject({
      name: 'Toast',
      coat: 'ginger',
      grams: 3_600,
      stage: 'Slim',
      happiness: 70,
      mood: 'happy',
      missesYou: false,
      kibble: { bowls: 0, minutesToNext: 25 },
      treats: 0,
    });
    expect(pet.toys.every((t) => !t.unlocked)).toBe(true);
  });

  it('eats the kibble focus has filled, and gets heavier and happier', async () => {
    const userId = await makeUser();
    await credit(userId, 50 * MIN);
    expect((await getPet(userId)).kibble.bowls).toBe(2);
    const fed = await careForPet(userId, { action: 'feed' });
    expect(fed.pet).toMatchObject({ grams: 3_700, happiness: 76 });
    expect(fed.pet.kibble.bowls).toBe(1);
    await careForPet(userId, { action: 'feed' });
    await failsWith(
      careForPet(userId, { action: 'feed' }),
      'INSUFFICIENT_FUNDS',
    );
  });

  it('never eats more bowls than the work filled, even on a double tap', async () => {
    const userId = await makeUser();
    await credit(userId, 25 * MIN);
    const results = await Promise.allSettled([
      careForPet(userId, { action: 'feed' }),
      careForPet(userId, { action: 'feed' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await getPet(userId)).grams).toBe(3_700);
  });

  it('gets two treats per good quiz', async () => {
    const userId = await makeUser();
    await credit(userId, 10 * MIN, { correct: 4, total: 4 });
    await credit(userId, 10 * MIN, { correct: 1, total: 4 });
    expect((await getPet(userId)).treats).toBe(2);
    const treated = await careForPet(userId, { action: 'treat' });
    expect(treated.pet.treats).toBe(1);
    expect(treated.pet.happiness).toBe(80);
  });

  it('keeps toys locked until the work unlocks them', async () => {
    const userId = await makeUser();
    await failsWith(careForPet(userId, { action: 'brush' }), 'INVALID_STATE');
    await failsWith(
      careForPet(userId, { action: 'play', toy: 'wand' }),
      'INVALID_STATE',
    );
  });

  it('pays happiness for play once per cooldown; more is just for fun', async () => {
    const userId = await makeUser();
    await credit(userId, 2 * H);
    const now = new Date();
    const first = await careForPet(
      userId,
      { action: 'play', toy: 'wand' },
      now,
    );
    expect(first.happinessRaised).toBe(true);
    expect(first.pet.happiness).toBe(82);
    const again = await careForPet(
      userId,
      { action: 'play', toy: 'wand' },
      new Date(now.getTime() + 5 * MIN),
    );
    expect(again.happinessRaised).toBe(false);
    expect(again.pet.happiness).toBe(82);
    const later = await careForPet(
      userId,
      { action: 'play', toy: 'wand' },
      new Date(now.getTime() + 21 * MIN),
    );
    expect(later.happinessRaised).toBe(true);
    expect(later.pet.happiness).toBe(94);
  });

  it('misses you and grows sad when left alone, and care brings her back', async () => {
    const userId = await makeUser();
    await credit(userId, 25 * MIN);
    await getPet(userId);
    await db
      .update(pets)
      .set({ happiness: 70, happinessAt: new Date(Date.now() - 40 * H) })
      .where(eq(pets.userId, userId));
    const alone = await getPet(userId);
    expect(alone).toMatchObject({
      happiness: 14,
      mood: 'sad',
      missesYou: true,
    });
    const fed = await careForPet(userId, { action: 'feed' });
    expect(fed.pet).toMatchObject({
      happiness: 20,
      mood: 'lonely',
      missesYou: false,
    });
  });

  it('takes a new name and coat, cleaned up', async () => {
    const userId = await makeUser();
    const pet = await updatePet(userId, {
      name: '  Mochi   Bean ',
      coat: 'tuxedo',
    });
    expect(pet).toMatchObject({ name: 'Mochi Bean', coat: 'tuxedo' });
  });

  it('shares a finished session: happier, and the kibble it filled', async () => {
    const userId = await makeUser();
    const now = Date.now();
    const [session] = await db
      .insert(focusSessions)
      .values({ userId, lootSeed: 'seed', startedAt: new Date(now - 30 * MIN) })
      .returning();
    const beats = [];
    for (
      let at = now - 30 * MIN, seq = 0;
      at <= now;
      at += HEARTBEAT_INTERVAL_MS
    ) {
      beats.push({
        sessionId: session!.id,
        seq: seq++,
        at: new Date(at),
        focused: true,
      });
    }
    await db.insert(sessionHeartbeats).values(beats);
    const result = await endSession({ userId, sessionId: session!.id });
    expect(result.pet).toEqual({ name: 'Toast', bowlsFilled: 1 });
    const pet = await getPet(userId);
    expect(pet.happiness).toBe(82);
    expect(pet.kibble.bowls).toBe(1);
  });
});
