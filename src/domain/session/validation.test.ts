import {
  HEARTBEAT_INTERVAL_MS,
  MAX_BEAT_GAP_MS,
  STALE_SESSION_MS,
} from './constants';
import {
  accumulateFocusedMs,
  creditForGap,
  isStale,
  isValidNextBeat,
} from './validation';

const beat = (atMs: number, focused = true) => ({ atMs, focused });

describe('accumulateFocusedMs', () => {
  it('returns 0 for an empty array and for a single beat', () => {
    expect(accumulateFocusedMs([])).toBe(0);
    expect(accumulateFocusedMs([beat(0)])).toBe(0);
  });

  it('sums gaps between consecutive focused beats', () => {
    expect(accumulateFocusedMs([beat(0), beat(15_000), beat(30_000)])).toBe(
      30_000,
    );
  });

  it('only counts a gap when the earlier beat was focused', () => {
    const beats = [
      beat(0, true),
      beat(15_000, false),
      beat(30_000, true),
      beat(45_000, true),
    ];
    expect(accumulateFocusedMs(beats)).toBe(30_000);
  });

  it('credits one interval, not the full gap, when a gap exceeds the maximum', () => {
    const beats = [
      beat(0),
      beat(MAX_BEAT_GAP_MS + 1),
      beat(MAX_BEAT_GAP_MS + 1 + 15_000),
    ];
    expect(accumulateFocusedMs(beats)).toBe(HEARTBEAT_INTERVAL_MS + 15_000);
  });

  it('credits the full gap right at the maximum', () => {
    expect(accumulateFocusedMs([beat(0), beat(MAX_BEAT_GAP_MS)])).toBe(
      MAX_BEAT_GAP_MS,
    );
  });
});

describe('creditForGap', () => {
  it('ignores negative and zero gaps', () => {
    expect(creditForGap(0, true)).toBe(0);
    expect(creditForGap(-5, true)).toBe(0);
  });
});

describe('isValidNextBeat', () => {
  it('accepts the first beat', () => {
    expect(
      isValidNextBeat({
        lastSeq: null,
        nextSeq: 0,
        lastAtMs: null,
        nowMs: 1000,
      }),
    ).toEqual({
      ok: true,
    });
  });

  it('rejects a seq equal to or below the last one', () => {
    const base = { lastSeq: 5, lastAtMs: 0, nowMs: 60_000 };
    expect(isValidNextBeat({ ...base, nextSeq: 5 })).toEqual({
      ok: false,
      reason: 'OUT_OF_ORDER',
    });
    expect(isValidNextBeat({ ...base, nextSeq: 4 })).toEqual({
      ok: false,
      reason: 'OUT_OF_ORDER',
    });
    expect(isValidNextBeat({ ...base, nextSeq: 6 })).toEqual({ ok: true });
  });

  it('rejects beats arriving faster than half the interval', () => {
    const base = { lastSeq: 1, nextSeq: 2, lastAtMs: 100_000 };
    expect(isValidNextBeat({ ...base, nowMs: 100_000 + 7_499 })).toEqual({
      ok: false,
      reason: 'TOO_FAST',
    });
    expect(isValidNextBeat({ ...base, nowMs: 100_000 + 7_500 })).toEqual({
      ok: true,
    });
  });
});

describe('isStale', () => {
  it('flips exactly past the threshold', () => {
    expect(isStale({ lastActivityMs: 0, nowMs: STALE_SESSION_MS })).toBe(false);
    expect(isStale({ lastActivityMs: 0, nowMs: STALE_SESSION_MS + 1 })).toBe(
      true,
    );
  });
});
