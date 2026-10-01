import {
  HAPPY_MAX,
  MISSES_YOU_AFTER_MS,
  happinessNow,
  missesYou,
  petMood,
  raiseHappiness,
  studyGain,
} from './happiness';

const H = 3_600_000;
const t0 = new Date('2026-10-01T08:00:00Z');
const later = (hours: number) => new Date(t0.getTime() + hours * H);

describe('happinessNow', () => {
  it('holds for half a day, then falls two points an hour', () => {
    expect(happinessNow(70, t0, later(6))).toBe(70);
    expect(happinessNow(70, t0, later(12))).toBe(70);
    expect(happinessNow(70, t0, later(13))).toBe(68);
    expect(happinessNow(70, t0, later(24))).toBe(46);
  });

  it('can fall all the way to sad, and never below zero', () => {
    expect(petMood(happinessNow(70, t0, later(42)))).toBe('sad');
    expect(happinessNow(70, t0, later(500))).toBe(0);
  });

  it('never reads above the top of the meter', () => {
    expect(happinessNow(150, t0, t0)).toBe(HAPPY_MAX);
  });
});

describe('raiseHappiness', () => {
  it('adds and clamps', () => {
    expect(raiseHappiness(50, 10)).toBe(60);
    expect(raiseHappiness(95, 10)).toBe(100);
  });
});

describe('petMood', () => {
  it('names every band', () => {
    expect(petMood(0)).toBe('sad');
    expect(petMood(25)).toBe('lonely');
    expect(petMood(50)).toBe('content');
    expect(petMood(70)).toBe('happy');
    expect(petMood(85)).toBe('delighted');
    expect(petMood(99)).toBe('over-the-moon');
  });
});

describe('studyGain', () => {
  it('gives 0.4 per whole credited minute', () => {
    expect(studyGain(25 * 60_000)).toBeCloseTo(10);
    expect(studyGain(59_000)).toBe(0);
    expect(studyGain(-1)).toBe(0);
  });
});

describe('missesYou', () => {
  it('turns on after 18 hours apart', () => {
    expect(
      missesYou(t0, new Date(t0.getTime() + MISSES_YOU_AFTER_MS - 1)),
    ).toBe(false);
    expect(missesYou(t0, new Date(t0.getTime() + MISSES_YOU_AFTER_MS))).toBe(
      true,
    );
  });
});
