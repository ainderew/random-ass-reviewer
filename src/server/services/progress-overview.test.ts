import { eq } from 'drizzle-orm';
import { initialCardState } from '@/domain/review/scheduler';
import type { FsrsState } from '@/domain/types';
import { closeDb, db } from '@/server/db';
import { cardReviews, focusSessions, users } from '@/server/db/schema';
import { insertCards } from '@/server/repositories/card';
import { insertNoteChunks, insertNoteSource } from '@/server/repositories/note';
import { getProgressOverview } from './progress-overview';
import { createUserWithDefaults } from './user-bootstrap';

const DAY = 86_400_000;
// Tuesday 2026-10-06, 10:00 in Manila.
const NOW = Date.parse('2026-10-06T10:00:00+08:00');

const reviewed = (stability: number, state: FsrsState['state'] = 2) => ({
  ...initialCardState(NOW),
  state,
  stability,
  reps: 4,
  last_review: new Date(NOW - DAY).toISOString(),
});

describe('progress overview', () => {
  let userId = '';

  beforeAll(async () => {
    const user = await createUserWithDefaults({
      id: 'ignored',
      email: `overview-${Date.now()}@test.local`,
      emailVerified: null,
    });
    userId = user.id;
    await db
      .update(users)
      .set({ timezone: 'Asia/Manila', examMonth: '2027-03', dailyNewCards: 2 })
      .where(eq(users.id, userId));
    const source = await insertNoteSource(db, {
      userId,
      kind: 'paste',
      title: 'Overview',
      contentHash: `overview-${userId}`,
    });
    const [chunk] = await insertNoteChunks(db, [
      { sourceId: source.id, ordinal: 0, text: 'text', tokenCount: 1 },
    ]);
    const card = (
      subject: 'hematology' | 'clinical-chemistry' | null,
      fsrsState: FsrsState,
      reviewStatus: 'approved' | 'draft' = 'approved',
    ) => ({
      userId,
      chunkId: chunk!.id,
      question: 'q',
      answer: 'a',
      sourceQuote: 'text',
      reviewStatus,
      subject,
      tags: [],
      nextDueAt: new Date(NOW),
      fsrsState,
    });
    const [solid, learning, edited] = await insertCards(db, [
      card('hematology', reviewed(40)),
      card('hematology', reviewed(5)),
      card('hematology', initialCardState(NOW)),
      card('clinical-chemistry', initialCardState(NOW)),
      card(null, initialCardState(NOW)),
      // Drafts are not in study yet.
      card('hematology', initialCardState(NOW), 'draft'),
    ]);
    // Missed on Monday, remembered on Tuesday: one recovered card.
    await db.insert(cardReviews).values([
      {
        cardId: learning!.id,
        rating: 1,
        reviewedAt: new Date(NOW - DAY),
        elapsedMs: 1,
      },
      {
        cardId: learning!.id,
        rating: 3,
        reviewedAt: new Date(NOW),
        elapsedMs: 1,
      },
      // Remembered three times across ten days: solid, and with no earlier
      // miss, not a recovery.
      {
        cardId: solid!.id,
        rating: 3,
        reviewedAt: new Date(NOW - 10 * DAY),
        elapsedMs: 1,
      },
      {
        cardId: solid!.id,
        rating: 2,
        reviewedAt: new Date(NOW - 5 * DAY),
        elapsedMs: 1,
      },
      { cardId: solid!.id, rating: 3, reviewedAt: new Date(NOW), elapsedMs: 1 },
      // Solid once, then edited: the reset schedule makes it not started, and
      // the history of the old wording no longer counts.
      ...[12, 9, 8].map((daysAgo) => ({
        cardId: edited!.id,
        rating: 3,
        reviewedAt: new Date(NOW - daysAgo * DAY),
        elapsedMs: 1,
      })),
    ]);
    await db.insert(focusSessions).values({
      userId,
      lootSeed: 's',
      startedAt: new Date(NOW - 2 * 3_600_000),
      endedAt: new Date(NOW - 3_600_000),
      status: 'completed',
      focusedMs: 3_600_000,
      creditedMs: 3_600_000,
    });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await closeDb();
  });

  it('stages every approved card by its review history, overall and by subject', async () => {
    const overview = await getProgressOverview(userId, NOW);
    expect(overview.cards).toEqual({ total: 5, new: 3, learning: 1, solid: 1 });
    const hematology = overview.subjects.find(
      (s) => s.subject === 'hematology',
    );
    expect(hematology?.stages).toEqual({
      total: 3,
      new: 1,
      learning: 1,
      solid: 1,
    });
    expect(
      overview.subjects.find((s) => s.subject === 'clinical-microscopy')?.stages
        .total,
    ).toBe(0);
  });

  it('paces the cards not yet started against the exam month', async () => {
    const overview = await getProgressOverview(userId, NOW);
    expect(overview.examMonth).toBe('2027-03');
    expect(overview.exam).toMatchObject({
      examStart: '2027-03-01',
      daysLeft: 146,
      startedAllBy: '2026-10-07',
      onPace: true,
    });
    expect(overview.dailyNewLimit).toBe(2);
  });

  it('counts recovered cards and this local week from Monday', async () => {
    const overview = await getProgressOverview(userId, NOW);
    expect(overview.recovered).toBe(1);
    expect(overview.week.days.map((d) => d.date)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(overview.week.days.map((d) => d.active)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(overview.week.focusMinutes).toBe(60);
    expect(overview.week.reviews).toBe(3);
  });
});
