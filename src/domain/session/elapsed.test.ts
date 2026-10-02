import {
  MAX_SESSION_MS,
  countedMs,
  isOverLimit,
  sessionLimitMs,
} from './elapsed';

const MIN = 60_000;
const at = (ms: number) => new Date(ms);

describe('session time', () => {
  it('counts from start to now, away or not', () => {
    const session = { startedAt: at(0), mode: 'focus' as const };
    expect(countedMs(session, 40 * MIN)).toBe(40 * MIN);
    expect(countedMs({ startedAt: at(0) }, 3 * MIN)).toBe(3 * MIN);
  });

  it('never counts a clock that runs backwards', () => {
    expect(countedMs({ startedAt: at(10 * MIN) }, 0)).toBe(0);
  });

  it('stops at two hours, so a forgotten timer does not pay for the night', () => {
    const session = { startedAt: at(0) };
    expect(countedMs(session, 9 * 60 * MIN)).toBe(MAX_SESSION_MS);
    expect(isOverLimit(session, MAX_SESSION_MS - 1)).toBe(false);
    expect(isOverLimit(session, MAX_SESSION_MS)).toBe(true);
  });

  it('keeps the old reading blocks to their own limit', () => {
    const reading = {
      startedAt: at(0),
      mode: 'reading' as const,
      readingLimitMs: 15 * MIN,
    };
    expect(sessionLimitMs(reading)).toBe(15 * MIN);
    expect(countedMs(reading, 40 * MIN)).toBe(15 * MIN);
    expect(sessionLimitMs({ ...reading, readingLimitMs: 9 * 60 * MIN })).toBe(
      30 * MIN,
    );
    expect(sessionLimitMs({ ...reading, readingLimitMs: null })).toBe(0);
  });
});
