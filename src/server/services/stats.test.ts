import { eq } from 'drizzle-orm';
import { initialCardState } from '@/domain/review/scheduler';
import { closeDb, db } from '@/server/db';
import { focusSessions, users } from '@/server/db/schema';
import { insertCards } from '@/server/repositories/card';
import { insertNoteChunks, insertNoteSource } from '@/server/repositories/note';
import { submitAnswer } from './review';
import { getWeeklySummary } from './stats';
import { createUserWithDefaults } from './user-bootstrap';
import { exportUserData } from './user-export';
import { getDailySummary } from './user-stats';

const HOUR = 3_600_000;

describe('weekly summary and export', () => {
  let userId = '';
  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `weekly-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
  });
  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await closeDb();
  });

  it('sums this week in the user day, flags heavy weeks, and counts reviews', async () => {
    // Wednesday 2026-09-09 12:00 UTC; the week started Monday the 7th.
    const now = Date.UTC(2026, 8, 9, 12, 0, 0);
    const session = (start: number, ms: number) => ({
      userId,
      lootSeed: 's',
      startedAt: new Date(start),
      endedAt: new Date(start + ms),
      status: 'completed' as const,
      focusedMs: ms,
      creditedMs: ms,
    });
    await db.insert(focusSessions).values([
      session(now - 2 * HOUR, 2 * HOUR),
      session(now - 30 * HOUR, 11 * HOUR),
      // Last week: excluded.
      session(now - 8 * 24 * HOUR, 3 * HOUR),
    ]);
    const source = await insertNoteSource(db, {
      userId,
      kind: 'paste',
      title: 'w',
      contentHash: `w-${userId}`,
    });
    const [chunk] = await insertNoteChunks(db, [
      { sourceId: source.id, ordinal: 0, text: 't', tokenCount: 1 },
    ]);
    const [card] = await insertCards(db, [
      {
        userId,
        chunkId: chunk!.id,
        question: 'q',
        answer: 'a',
        sourceQuote: 't',
        tags: [],
        nextDueAt: new Date(),
        fsrsState: initialCardState(Date.now()),
      },
    ]);
    await submitAnswer({ userId, cardId: card!.id, rating: 3, elapsedMs: 1 });

    const summary = await getWeeklySummary(userId, now);
    expect(summary.weekStart).toBe('2026-09-07');
    expect(summary.sessions).toBe(2);
    expect(summary.hours).toBeCloseTo(13, 5);
    expect(summary.bestDay).toMatchObject({ hours: 11 });
    expect(summary.heavy).toBe(true);
    expect(summary.cardsReviewed).toBe(1);
    expect(summary.retention).toBe(1);

    const today = await getDailySummary(userId);
    expect(today.creditedMs).toBeGreaterThan(0);

    const exported = await exportUserData(userId);
    expect(exported.user.email).toContain('weekly-');
    expect(exported.sessions).toHaveLength(3);
    expect(exported.cards).toHaveLength(1);
    expect(JSON.stringify(exported)).not.toMatch(/encrypted|sk-ant/);
  });
});
