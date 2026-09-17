import { eq } from 'drizzle-orm';
import { db, closeDb } from '@/server/db';
import { focusSessions, users } from '@/server/db/schema';
import {
  startSession,
  getActiveSession,
  recordHeartbeat,
} from './focus-session';
import { endSession } from './end-session';
import { createUserWithDefaults } from './user-bootstrap';
const ids: string[] = [];
async function user() {
  const u = await createUserWithDefaults({
    id: 'ignored',
    email: `reading-${crypto.randomUUID()}@test.local`,
    emailVerified: null,
  });
  ids.push(u.id);
  return u.id;
}
afterAll(async () => {
  for (const id of ids) await db.delete(users).where(eq(users.id, id));
  await closeDb();
});
it('resumes PDF reading with no heartbeats and caps a late finish without paying twice', async () => {
  const userId = await user();
  const session = await startSession(userId, { mode: 'reading', minutes: 15 });
  expect(session).toMatchObject({ mode: 'reading', readingLimitMs: 900000 });
  await db
    .update(focusSessions)
    .set({ startedAt: new Date(Date.now() - 600000) })
    .where(eq(focusSessions.id, session.sessionId));
  expect((await getActiveSession(userId))?.sessionId).toBe(session.sessionId);
  expect(
    (
      await recordHeartbeat({
        userId,
        sessionId: session.sessionId,
        seq: 0,
        focused: false,
      })
    ).focusedMs,
  ).toBeGreaterThanOrEqual(600000);
  expect((await startSession(userId)).sessionId).toBe(session.sessionId);
  await db
    .update(focusSessions)
    .set({ startedAt: new Date(Date.now() - 3600000) })
    .where(eq(focusSessions.id, session.sessionId));
  const result = await endSession({ userId, sessionId: session.sessionId });
  expect(result).toMatchObject({
    mode: 'reading',
    focusedMs: 900000,
    creditedMs: 900000,
    focusAwarded: 150,
  });
  await expect(
    endSession({ userId, sessionId: session.sessionId }),
  ).rejects.toMatchObject({ code: 'INVALID_STATE' });
});
it('settles expired reading at its cap on return, rejects unsupported durations and other owners', async () => {
  const userId = await user();
  const other = await user();
  const session = await startSession(userId, { mode: 'reading', minutes: 5 });
  await expect(
    endSession({ userId: other, sessionId: session.sessionId }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await db
    .update(focusSessions)
    .set({ startedAt: new Date(Date.now() - 900000) })
    .where(eq(focusSessions.id, session.sessionId));
  expect(await getActiveSession(userId)).toBeNull();
  const saved = await db.query.focusSessions.findFirst({
    where: eq(focusSessions.id, session.sessionId),
  });
  expect(saved).toMatchObject({
    focusedMs: 300000,
    creditedMs: 300000,
    status: 'completed',
  });
  // Deliberately bypass the type to exercise the service's trust boundary.
  await expect(
    startSession(userId, { mode: 'reading', minutes: 90 as 5 }),
  ).rejects.toThrow();
});
