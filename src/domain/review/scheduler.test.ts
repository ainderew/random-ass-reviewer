import {
  initialCardState,
  parseState,
  previewIntervals,
  scheduleReview,
} from './scheduler';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 8, 8, 9, 0, 0);

describe('scheduler', () => {
  it('starts a card due immediately', () => {
    const state = initialCardState(T0);
    expect(new Date(state.due).getTime()).toBe(T0);
    expect(state.reps).toBe(0);
    expect(state.state).toBe(0);
  });

  it('Again shortens the interval, Easy lengthens it more than Good', () => {
    const state = initialCardState(T0);
    const again = scheduleReview({ state, rating: 1, nowMs: T0 });
    const good = scheduleReview({ state, rating: 3, nowMs: T0 });
    const easy = scheduleReview({ state, rating: 4, nowMs: T0 });
    expect(again.nextDueAtMs).toBeLessThan(good.nextDueAtMs);
    expect(easy.nextDueAtMs).toBeGreaterThan(good.nextDueAtMs);
    expect(again.state.lapses + again.state.reps).toBeGreaterThan(0);
  });

  it('repeated Good ratings produce non-decreasing intervals over ninety days', () => {
    let state = initialCardState(T0);
    let now = T0;
    let lastInterval = -1;
    for (let i = 0; i < 12 && now < T0 + 90 * DAY; i += 1) {
      const next = scheduleReview({ state, rating: 3, nowMs: now });
      expect(next.intervalDays).toBeGreaterThanOrEqual(lastInterval);
      lastInterval = next.intervalDays;
      state = next.state;
      now = next.nextDueAtMs;
    }
    // Intervals outgrow the window in a handful of reviews: that is the point.
    expect(lastInterval).toBeGreaterThan(7);
    expect(state.reps).toBeGreaterThanOrEqual(4);
  });

  it('is deterministic for the same state and clock, fuzz included', () => {
    let state = initialCardState(T0);
    let now = T0;
    for (let i = 0; i < 5; i += 1) {
      const next = scheduleReview({ state, rating: 3, nowMs: now });
      state = next.state;
      now = next.nextDueAtMs;
    }
    const a = scheduleReview({ state, rating: 3, nowMs: now });
    const b = scheduleReview({ state, rating: 3, nowMs: now });
    expect(a).toEqual(b);
  });

  it('previews one interval per rating in ascending order', () => {
    const intervals = previewIntervals({
      state: initialCardState(T0),
      nowMs: T0,
    });
    expect(intervals[1]).toBeLessThan(intervals[3]);
    expect(intervals[3]).toBeLessThan(intervals[4]);
    expect(intervals[1]).toBeGreaterThan(0);
  });

  it('round-trips through JSON unchanged', () => {
    const next = scheduleReview({
      state: initialCardState(T0),
      rating: 3,
      nowMs: T0,
    });
    const restored = parseState(JSON.parse(JSON.stringify(next.state)), T0);
    expect(restored).toEqual(next.state);
    expect(
      scheduleReview({ state: restored, rating: 3, nowMs: next.nextDueAtMs }),
    ).toEqual(
      scheduleReview({ state: next.state, rating: 3, nowMs: next.nextDueAtMs }),
    );
  });

  it('resets a corrupt or legacy blob instead of throwing', () => {
    expect(parseState({ difficulty: 0, stability: 0, reps: 0 }, T0)).toEqual(
      initialCardState(T0),
    );
    expect(parseState('garbage', T0)).toEqual(initialCardState(T0));
  });
});
