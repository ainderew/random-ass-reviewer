import {
  currentRungNote,
  nextRung,
  passedRungs,
  ringProgress,
  rungPosition,
  rungsWithin,
  SESSION_RUNGS,
} from './rungs';

const MIN = 60_000;

describe('session rungs', () => {
  it('mark the five-minute streak threshold', () => {
    expect(SESSION_RUNGS.map((r) => r.atMs / MIN)).toEqual([5]);
    expect(SESSION_RUNGS[0]!.label).toBe('Streak day earned');
  });

  it('cuts to the chosen length and finds the next one', () => {
    expect(rungsWithin(25 * MIN).map((r) => r.atMs / MIN)).toEqual([5]);
    expect(rungsWithin(null)).toHaveLength(1);
    expect(nextRung(2 * MIN, 25 * MIN)?.atMs).toBe(5 * MIN);
    expect(nextRung(20 * MIN, 25 * MIN)).toBeNull();
    expect(nextRung(95 * MIN, null)).toBeNull();
    expect(passedRungs(46 * MIN)).toHaveLength(1);
  });

  it('shows a note for the minute after a rung, then goes quiet', () => {
    expect(currentRungNote(14 * MIN)).toBeNull();
    expect(currentRungNote(16 * MIN)).toBeNull();
  });

  it('fills a fixed ring toward its end and an open ring toward the next rung', () => {
    expect(ringProgress(12.5 * MIN, 25 * MIN)).toBeCloseTo(0.5);
    expect(ringProgress(40 * MIN, 25 * MIN)).toBe(1);
    expect(ringProgress(2.5 * MIN, null)).toBeCloseTo(0.5);
    expect(ringProgress(10 * MIN, null)).toBe(1);
    expect(ringProgress(120 * MIN, null)).toBe(1);
    expect(rungPosition(SESSION_RUNGS[0]!, 50 * MIN)).toBeCloseTo(0.1);
  });
});
