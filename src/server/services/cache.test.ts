import { eq } from 'drizzle-orm';
import { HEARTBEAT_INTERVAL_MS } from '@/domain/session/constants';
import { closeDb, db } from '@/server/db';
import {
  caches,
  focusSessions,
  sessionHeartbeats,
  users,
  userStats,
} from '@/server/db/schema';
import { findUserStats } from '@/server/repositories/user-stats';
import { openCache } from './cache';
import { endSession } from './end-session';
import { createUserWithDefaults } from './user-bootstrap';
import { getStatsSnapshot } from './user-stats';

async function makeUser(tag: string): Promise<string> {
  const user = await createUserWithDefaults({
    id: 'ignored',
    email: `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
    emailVerified: null,
  });
  return user.id;
}

async function seedSession(userId: string, spanMs: number): Promise<string> {
  const now = Date.now();
  const [session] = await db
    .insert(focusSessions)
    .values({
      userId,
      lootSeed: `seed-${userId}`,
      startedAt: new Date(now - spanMs),
    })
    .returning();
  const beats = [];
  for (let at = now - spanMs, seq = 0; at <= now; at += HEARTBEAT_INTERVAL_MS) {
    beats.push({
      sessionId: session!.id,
      seq: seq++,
      at: new Date(at),
      focused: true,
    });
  }
  await db.insert(sessionHeartbeats).values(beats);
  return session!.id;
}

describe('caches', () => {
  const created: string[] = [];
  afterAll(async () => {
    for (const id of created) await db.delete(users).where(eq(users.id, id));
    await closeDb();
  });

  it('never leaks contents, the pity counter, or the loot seed through session end or stats', async () => {
    const userId = await makeUser('leak');
    created.push(userId);
    // Force a drop so there is a cache to leak.
    await db
      .update(userStats)
      .set({ pityCounter: 12 })
      .where(eq(userStats.userId, userId));
    const sessionId = await seedSession(userId, 25 * 60_000);
    const result = await endSession({ userId, sessionId });
    const body = JSON.stringify(result);
    expect(result.cache).not.toBeNull();
    expect(body).not.toMatch(
      /contents|pityCounter|pity_counter|lootSeed|loot_seed/,
    );

    const snapshot = JSON.stringify(await getStatsSnapshot(userId));
    expect(snapshot).not.toMatch(/pityCounter/);
  });

  it('credits once however many times a cache is opened, and hides it from other users', async () => {
    const userId = await makeUser('open');
    const intruder = await makeUser('intruder');
    created.push(userId, intruder);
    await db
      .update(userStats)
      .set({ pityCounter: 12 })
      .where(eq(userStats.userId, userId));
    const sessionId = await seedSession(userId, 25 * 60_000);
    const result = await endSession({ userId, sessionId });
    const cacheId = result.cache!.id;

    const before = await findUserStats(db, userId);
    const first = await openCache({ userId, cacheId });
    const second = await openCache({ userId, cacheId });
    const parallel = await Promise.all([
      openCache({ userId, cacheId }),
      openCache({ userId, cacheId }),
    ]);
    const after = await findUserStats(db, userId);

    expect(first.alreadyOpened).toBe(false);
    expect(second).toEqual({ ...first, alreadyOpened: true });
    for (const p of parallel) expect(p.alreadyOpened).toBe(true);
    expect(after!.focusBalance - before!.focusBalance).toBe(
      first.contents.focus,
    );
    expect(after!.insightBalance - before!.insightBalance).toBe(
      first.contents.insight,
    );
    const row = await db.query.caches.findFirst({
      where: eq(caches.id, cacheId),
    });
    expect(row!.openedAt).not.toBeNull();

    await expect(
      openCache({ userId: intruder, cacheId }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });
});
