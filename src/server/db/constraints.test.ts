import { eq } from 'drizzle-orm';
import { closeDb, db } from '@/server/db';
import { isUniqueViolation } from '@/server/db/errors';
import { focusSessions, sessionHeartbeats, users } from '@/server/db/schema';

// These verify the database, so mocking it would test nothing.
const settle = (promise: Promise<unknown>) =>
  promise.then(() => null).catch((e: unknown) => e);

describe('database constraints', () => {
  let userId = '';

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({ email: `constraints-${Date.now()}@test.local` })
      .returning();
    userId = user!.id;
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await closeDb();
  });

  it('rejects a replayed heartbeat seq', async () => {
    const [session] = await db
      .insert(focusSessions)
      .values({ userId, startedAt: new Date() })
      .returning();
    const beat = {
      sessionId: session!.id,
      seq: 0,
      focused: true,
      at: new Date(),
    };

    await db.insert(sessionHeartbeats).values(beat);
    const error = await settle(db.insert(sessionHeartbeats).values(beat));

    expect(isUniqueViolation(error)).toBe(true);
    await db.delete(focusSessions).where(eq(focusSessions.id, session!.id));
  });

  it('allows one active session per user', async () => {
    const values = { userId, startedAt: new Date() };

    await db.insert(focusSessions).values(values);
    const error = await settle(db.insert(focusSessions).values(values));

    expect(isUniqueViolation(error)).toBe(true);
    await db.insert(focusSessions).values({ ...values, status: 'completed' });
  });
});
