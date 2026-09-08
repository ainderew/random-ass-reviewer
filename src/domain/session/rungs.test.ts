import {
  currentRungNote,
  earningsSoFar,
  nextRung,
  passedRungs,
  ringProgress,
  rungPosition,
  rungsWithin,
  SESSION_RUNGS,
} from './rungs';

const MIN = 60_000;

describe('session rungs', () => {
  it('are derived from the economy: 5, 15, 45, 60, 75, 90 minutes', () => {
    expect(SESSION_RUNGS.map((r) => r.atMs / MIN)).toEqual([
      5, 15, 45, 60, 75, 90,
    ]);
    expect(SESSION_RUNGS[0]!.label).toBe('Counts now');
    expect(SESSION_RUNGS[1]!.label).toBe('Chest secured');
    expect(SESSION_RUNGS[SESSION_RUNGS.length - 1]!.kind).toBe('odds-cap');
  });

  it('cuts to the chosen length and finds the next one', () => {
    expect(rungsWithin(25 * MIN).map((r) => r.atMs / MIN)).toEqual([5, 15]);
    expect(rungsWithin(null)).toHaveLength(6);
    expect(nextRung(6 * MIN, 25 * MIN)?.atMs).toBe(15 * MIN);
    expect(nextRung(20 * MIN, 25 * MIN)).toBeNull();
    expect(nextRung(95 * MIN, null)).toBeNull();
    expect(passedRungs(46 * MIN)).toHaveLength(3);
  });

  it('shows a note for the minute after a rung, then goes quiet', () => {
    expect(currentRungNote(14 * MIN)).toBeNull();
    expect(currentRungNote(15 * MIN)?.label).toBe('Chest secured');
    expect(currentRungNote(15 * MIN + 59_000)?.label).toBe('Chest secured');
    expect(currentRungNote(16 * MIN)).toBeNull();
  });

  it('fills a fixed ring toward its end and an open ring toward the next rung', () => {
    expect(ringProgress(12.5 * MIN, 25 * MIN)).toBeCloseTo(0.5);
    expect(ringProgress(40 * MIN, 25 * MIN)).toBe(1);
    expect(ringProgress(2.5 * MIN, null)).toBeCloseTo(0.5);
    expect(ringProgress(10 * MIN, null)).toBeCloseTo(0.5);
    expect(ringProgress(120 * MIN, null)).toBe(1);
    expect(rungPosition(SESSION_RUNGS[1]!, 50 * MIN)).toBeCloseTo(0.3);
  });

  it('mirrors the server award for the courtesy figure', () => {
    expect(earningsSoFar(0)).toBe(0);
    expect(earningsSoFar(27 * MIN + 14_000)).toBe(270);
  });
});
