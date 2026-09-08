import { eq } from 'drizzle-orm';
import { DAILY_CREDITABLE_MS } from '@/domain/economy/constants';
import {
  HEARTBEAT_INTERVAL_MS,
  MAX_SESSIONS_PER_DAY,
} from '@/domain/session/constants';
import { closeDb, db } from '@/server/db';
import {
  focusSessions,
  sessionHeartbeats,
  users,
  userStats,
} from '@/server/db/schema';
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

// Seeds a session that started `spanMs` ago with a focused beat every 15s
// until `endOffsetMs` before now. Timestamps are written directly because the
// service stamps its own clock and cannot be told to backdate.
async function seedSession(
  userId: string,
  spanMs: number,
  endOffsetMs = 0,
): Promise<string> {
  const now = Date.now();
  const startedAt = new Date(now - spanMs);
  const [session] = await db
    .insert(focusSessions)
    .values({ userId, lootSeed: 'seed', startedAt })
    .returning();
  const beats = [];
  for (
    let at = now - spanMs, seq = 0;
    at <= now - endOffsetMs;
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
  return session!.id;
}

async function sessionRow(id: string) {
  return db.query.focusSessions.findFirst({ where: eq(focusSessions.id, id) });
}

async function beatCount(sessionId: string): Promise<number> {
  const rows = await db
    .select()
    .from(sessionHeartbeats)
    .where(eq(sessionHeartbeats.sessionId, sessionId));
  return rows.length;
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

  it('awards zero when a session ends with no heartbeats', async () => {
    const { sessionId } = await startSession(userId);

    const result = await endSession({ userId, sessionId });

    expect(result).toMatchObject({
      focusAwarded: 0,
      creditedMs: 0,
      belowMinimum: true,
    });
    expect((await sessionRow(sessionId))?.status).toBe('completed');
  });

  it('ignores a replayed heartbeat seq', async () => {
    const { sessionId } = await startSession(userId);

    await recordHeartbeat({ userId, sessionId, seq: 0, focused: true });
    await recordHeartbeat({ userId, sessionId, seq: 0, focused: true });

    expect(await beatCount(sessionId)).toBe(1);
  });

  it('credits at most one interval for 200 heartbeats in a burst', async () => {
    const { sessionId } = await startSession(userId);

    const startedAt = Date.now();
    let focusedMs = 0;
    for (let seq = 0; seq < 200; seq += 1) {
      ({ focusedMs } = await recordHeartbeat({
        userId,
        sessionId,
        seq,
        focused: true,
      }));
    }

    // Credit can never exceed real elapsed time, however fast the beats came.
    // Under coverage instrumentation the loop itself takes real seconds, so
    // the bound is the wall clock, not a constant.
    const elapsed = Date.now() - startedAt;
    expect(focusedMs).toBeLessThanOrEqual(
      Math.max(HEARTBEAT_INTERVAL_MS, elapsed),
    );
    expect(await beatCount(sessionId)).toBeLessThanOrEqual(
      2 + Math.ceil(elapsed / HEARTBEAT_INTERVAL_MS),
    );
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
      focusedMs: minutes(10),
      creditedMs: minutes(10),
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
      focusedMs: minutes(10),
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

  it('sweeps a stale session and credits only up to its last heartbeat', async () => {
    const sessionId = await seedSession(userId, minutes(20), minutes(10));

    expect(await getActiveSession(userId)).toBeNull();

    const row = await sessionRow(sessionId);
    expect(row?.status).toBe('completed');
    expect(row?.focusedMs).toBe(minutes(10));
    expect(row?.creditedMs).toBe(minutes(10));
  });

  it('exposes the last accepted seq so a reload can continue', async () => {
    const { sessionId } = await startSession(userId);
    await recordHeartbeat({ userId, sessionId, seq: 0, focused: true });

    const snapshot = await getActiveSession(userId);

    expect(snapshot).toMatchObject({ sessionId, lastSeq: 0 });
  });
});
