import { MAX_NEW_CARDS_PER_DAY, MAX_REVIEWS_PER_SESSION } from './constants';
import { selectQueue, selectQuizCards, shuffleWithSeed } from './queue';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 8, 12, 0, 0);
const card = (id: string, dueOffsetMs: number) => ({
  id,
  nextDueAtMs: NOW + dueOffsetMs,
});

describe('selectQueue', () => {
  it('puts the most overdue card first', () => {
    const queue = selectQueue({
      due: [
        card('a', -1 * DAY),
        card('b', -5 * DAY),
        card('c', -2 * DAY),
        card('d', -60_000),
      ],
      newCards: [card('n1', 0)],
      newCardsSeenToday: 0,
      nowMs: NOW,
    });
    expect(queue.map((c) => c.id)).toEqual(['b', 'c', 'a', 'n1', 'd']);
  });

  it('caps new cards at the daily allowance', () => {
    const newCards = Array.from({ length: 40 }, (_, i) => card(`n${i}`, 0));
    const fresh = selectQueue({
      due: [],
      newCards,
      newCardsSeenToday: 5,
      nowMs: NOW,
    });
    expect(fresh).toHaveLength(MAX_NEW_CARDS_PER_DAY - 5);
    expect(
      selectQueue({ due: [], newCards, newCardsSeenToday: 25, nowMs: NOW }),
    ).toHaveLength(0);
  });

  it('caps the whole queue per session', () => {
    const due = Array.from({ length: 200 }, (_, i) => card(`d${i}`, -i * 1000));
    expect(
      selectQueue({ due, newCards: [], newCardsSeenToday: 0, nowMs: NOW }),
    ).toHaveLength(MAX_REVIEWS_PER_SESSION);
  });
});

describe('selectQuizCards', () => {
  const candidates = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}` }));

  it('returns the same set for the same seed', () => {
    const a = selectQuizCards({ candidates, count: 8, seed: 'session-1' });
    const b = selectQuizCards({ candidates, count: 8, seed: 'session-1' });
    expect(a).toEqual(b);
    expect(a).toHaveLength(8);
    expect(new Set(a.map((c) => c.id)).size).toBe(8);
  });

  it('differs across seeds and returns what exists when short', () => {
    const a = selectQuizCards({ candidates, count: 8, seed: 'session-1' });
    const b = selectQuizCards({ candidates, count: 8, seed: 'session-2' });
    expect(a).not.toEqual(b);
    expect(
      selectQuizCards({
        candidates: candidates.slice(0, 3),
        count: 8,
        seed: 'x',
      }),
    ).toHaveLength(3);
  });

  it('shuffles options deterministically', () => {
    expect(shuffleWithSeed(['a', 'b', 'c', 'd'], 's')).toEqual(
      shuffleWithSeed(['a', 'b', 'c', 'd'], 's'),
    );
  });
});
