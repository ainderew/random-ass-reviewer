import { eq } from 'drizzle-orm';
import { DAILY_CREDITABLE_MS } from '@/domain/economy/constants';
import { MAX_SESSIONS_PER_DAY } from '@/domain/session/constants';
import { MAX_SESSION_MS } from '@/domain/session/elapsed';
import { closeDb, db } from '@/server/db';
import { focusSessions, users, userStats } from '@/server/db/schema';
import { AppError } from '@/server/errors';
import { endSession } from './end-session';
import {
  getActiveSession,
  recordHeartbeat,
  startSession,
} from './focus-session';
import { createUserWithDefaults } from './user-bootstrap';

// The unique indexes are the anti-cheat. Mocking the database would test nothing.

const minutes = (n: number) => n * 60_000;

async function makeUser(tag: string): Promise<string> {
  const user = await createUserWithDefaults({
    id: 'ignored',
    email: `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
    emailVerified: null,
  });
  return user.id;
}

// Seeds a session that started `spanMs` ago. The start is written directly
// because the service stamps its own clock and cannot be told to backdate.
// No check-ins: time counts from the start whether or not the app was open.
async function seedSession(userId: string, spanMs: number): Promise<string> {
  const [session] = await db
    .insert(focusSessions)
    .values({
      userId,
      lootSeed: 'seed',
      startedAt: new Date(Date.now() - spanMs),
    })
    .returning();
  return session!.id;
}

// The server clock keeps moving while a test runs.
const about = (ms: number) => ({
  asymmetricMatch: (actual: number) => actual >= ms && actual < ms + 5_000,
  toString: () => `about ${ms}`,
});

async function sessionRow(id: string) {
  return db.query.focusSessions.findFirst({ where: eq(focusSessions.id, id) });
}

describe('focus session service', () => {
  const created: string[] = [];
  let userId = '';

  beforeAll(async () => {
    userId = await makeUser('session');
    created.push(userId);
  });

  afterAll(async () => {
    for (const id of created) await db.delete(users).where(eq(users.id, id));
    await closeDb();
  });

  afterEach(async () => {
    await db.delete(focusSessions).where(eq(focusSessions.userId, userId));
  });

  it('returns the existing session instead of starting a second one', async () => {
    const first = await startSession(userId);
    const second = await startSession(userId);

    expect(second.sessionId).toBe(first.sessionId);
    expect(first).not.toHaveProperty('lootSeed');
  });

  it('pays nothing for a session ended straight away', async () => {
    const { sessionId } = await startSession(userId);

    const result = await endSession({ userId, sessionId });

    expect(result).toMatchObject({
      focusAwarded: 0,
      creditedMs: 0,
      belowMinimum: true,
    });
    expect((await sessionRow(sessionId))?.status).toBe('completed');
  });

  it('keeps counting with the app in the background, no check-ins at all', async () => {
    // Users of their own, so these payouts do not move the shared user's level.
    const away = await makeUser('away');
    created.push(away);
    const sessionId = await seedSession(away, minutes(40));

    const snapshot = await getActiveSession(away);
    expect(snapshot).toMatchObject({
      sessionId,
      focusedMs: about(minutes(40)),
    });

    const result = await endSession({ userId: away, sessionId });
    expect(result).toMatchObject({
      focusedMs: about(minutes(40)),
      focusAwarded: 400,
    });
  });

  it('reports the server count on a check-in, whatever arrives or how often', async () => {
    const checker = await makeUser('checker');
    created.push(checker);
    const sessionId = await seedSession(checker, minutes(10));

    const checks = await Promise.all(
      Array.from({ length: 50 }, () =>
        recordHeartbeat({ userId: checker, sessionId }),
      ),
    );

    for (const { focusedMs } of checks)
      expect(focusedMs).toEqual(about(minutes(10)));
    const result = await endSession({ userId: checker, sessionId });
    expect(result.focusAwarded).toBe(100);
  });

  it('refuses a check-in on a session that is not yours or has ended', async () => {
    const other = await makeUser('peek');
    created.push(other);
    const { sessionId } = await startSession(userId);

    await expect(
      recordHeartbeat({ userId: other, sessionId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await endSession({ userId, sessionId });
    await expect(recordHeartbeat({ userId, sessionId })).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
  });

  it('completes a short session with zero payout and no error', async () => {
    const sessionId = await seedSession(userId, minutes(3));

    const result = await endSession({ userId, sessionId });

    expect(result.belowMinimum).toBe(true);
    expect(result.focusAwarded).toBe(0);
    expect((await sessionRow(sessionId))?.status).toBe('completed');
  });

  it('pays 10 Focus per focused minute on a normal session', async () => {
    const sessionId = await seedSession(userId, minutes(10));
    const before = await db.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });

    const result = await endSession({ userId, sessionId });
    const after = await db.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });

    expect(result).toMatchObject({
      focusedMs: about(minutes(10)),
      creditedMs: about(minutes(10)),
      focusAwarded: 100,
    });
    expect(after!.focusBalance - before!.focusBalance).toBe(100);
    expect(after!.xp - before!.xp).toBe(100);
    expect(after!.level).toBe(2);
  });

  it('clamps credited time to the daily cap and says so', async () => {
    await db.insert(focusSessions).values({
      userId,
      lootSeed: 'seed',
      startedAt: new Date(Date.now() - minutes(60)),
      endedAt: new Date(),
      status: 'completed',
      focusedMs: DAILY_CREDITABLE_MS,
      creditedMs: DAILY_CREDITABLE_MS - minutes(6),
    });
    const sessionId = await seedSession(userId, minutes(10));

    const result = await endSession({ userId, sessionId });

    expect(result).toMatchObject({
      focusedMs: about(minutes(10)),
      creditedMs: minutes(6),
      focusAwarded: 60,
      cappedByDailyLimit: true,
    });
  });

  it('refuses a 13th session in one day', async () => {
    const now = new Date();
    await db.insert(focusSessions).values(
      Array.from({ length: MAX_SESSIONS_PER_DAY }, () => ({
        userId,
        lootSeed: 'seed',
        startedAt: now,
        endedAt: now,
        status: 'completed' as const,
      })),
    );

    await expect(startSession(userId)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });

  it('rejects ending a session that belongs to someone else', async () => {
    const other = await makeUser('other');
    created.push(other);
    const { sessionId } = await startSession(userId);

    await expect(
      endSession({ userId: other, sessionId }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect((await sessionRow(sessionId))?.status).toBe('active');
  });

  it('rolls back the session update when the payout fails', async () => {
    const [orphan] = await db
      .insert(users)
      .values({ email: `orphan-${Date.now()}@test.local` })
      .returning();
    created.push(orphan!.id);
    const sessionId = await seedSession(orphan!.id, minutes(10));

    const error = await endSession({ userId: orphan!.id, sessionId }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(AppError);
    expect((await sessionRow(sessionId))?.status).toBe('active');
  });

  it('settles a timer left running overnight at two hours', async () => {
    const sessionId = await seedSession(userId, minutes(9 * 60));

    expect(await getActiveSession(userId)).toBeNull();

    const row = await sessionRow(sessionId);
    expect(row).toMatchObject({
      status: 'completed',
      focusedMs: MAX_SESSION_MS,
      creditedMs: MAX_SESSION_MS,
    });
  });

  it('keeps a session open just under the limit', async () => {
    const sessionId = await seedSession(userId, MAX_SESSION_MS - minutes(1));

    expect(await getActiveSession(userId)).toMatchObject({ sessionId });
  });
});
