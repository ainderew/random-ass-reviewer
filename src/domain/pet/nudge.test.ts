import { localHour, nudgeCopy, nudgeDue } from './nudge';

const H = 3_600_000;
// 15:00 in Manila, 07:00 UTC.
const now = new Date('2026-10-01T07:00:00Z');
const ago = (hours: number) => new Date(now.getTime() - hours * H);

describe('localHour', () => {
  it('reads the hour off the student clock', () => {
    expect(localHour(now, 'Asia/Manila')).toBe(15);
    expect(localHour(now, 'UTC')).toBe(7);
  });

  it('falls back to UTC for a zone it does not know', () => {
    expect(localHour(now, 'Not/AZone')).toBe(7);
  });
});

describe('nudgeDue', () => {
  const base = {
    lastTogether: ago(20),
    lastNudged: null,
    now,
    timeZone: 'Asia/Manila',
  };

  it('nudges after 18 hours apart, in waking hours', () => {
    expect(nudgeDue(base)).toBe(true);
  });

  it('waits until she has actually missed you', () => {
    expect(nudgeDue({ ...base, lastTogether: ago(10) })).toBe(false);
  });

  it('sends at most one a day', () => {
    expect(nudgeDue({ ...base, lastNudged: ago(5) })).toBe(false);
    expect(nudgeDue({ ...base, lastNudged: ago(21) })).toBe(true);
  });

  it('stays quiet at night on the student clock', () => {
    expect(nudgeDue({ ...base, timeZone: 'UTC' })).toBe(false);
    expect(nudgeDue({ ...base, timeZone: 'America/Los_Angeles' })).toBe(false);
  });
});

describe('nudgeCopy', () => {
  it('says she misses you and it is time to study', () => {
    expect(
      nudgeCopy({ name: 'Toast', happiness: 50, bowlsWaiting: 0 }),
    ).toEqual({
      title: 'Toast misses you',
      body: 'Time to study! She is waiting by the window.',
    });
  });

  it('mentions waiting kibble', () => {
    expect(
      nudgeCopy({ name: 'Toast', happiness: 50, bowlsWaiting: 2 }).title,
    ).toBe('Toast is hungry');
  });

  it('says so when she is sad, before anything else', () => {
    expect(
      nudgeCopy({ name: 'Mochi', happiness: 5, bowlsWaiting: 2 }).title,
    ).toBe('Mochi is sad');
  });
});
