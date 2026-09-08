import {
  FREEZES_PER_MONTH,
  STREAK_MILESTONES,
  milestoneInsight,
  updateStreak,
} from './streak';

const base = { currentStreak: 5, freezesRemaining: 2 };

describe('updateStreak', () => {
  it('starts at 1 for a first session', () => {
    expect(
      updateStreak({ ...base, lastSessionDate: null, todayDate: '2026-09-08' }),
    ).toMatchObject({
      streak: 1,
      freezeUsed: false,
    });
  });

  it('does not change on the same day', () => {
    expect(
      updateStreak({
        ...base,
        lastSessionDate: '2026-09-08',
        todayDate: '2026-09-08',
      }).streak,
    ).toBe(5);
  });

  it('increments on a consecutive day', () => {
    expect(
      updateStreak({
        ...base,
        lastSessionDate: '2026-09-07',
        todayDate: '2026-09-08',
      }).streak,
    ).toBe(6);
  });

  it('spends a freeze automatically on exactly one missed day', () => {
    const result = updateStreak({
      ...base,
      lastSessionDate: '2026-09-06',
      todayDate: '2026-09-08',
    });
    expect(result).toEqual({
      streak: 6,
      freezesRemaining: 1,
      freezeUsed: true,
      milestone: null,
    });
  });

  it('resets to 1, never 0, after two missed days or with no freezes left', () => {
    expect(
      updateStreak({
        ...base,
        lastSessionDate: '2026-09-05',
        todayDate: '2026-09-08',
      }).streak,
    ).toBe(1);
    expect(
      updateStreak({
        ...base,
        freezesRemaining: 0,
        lastSessionDate: '2026-09-06',
        todayDate: '2026-09-08',
      }).streak,
    ).toBe(1);
  });

  it('refills freezes at a month boundary', () => {
    const result = updateStreak({
      ...base,
      freezesRemaining: 0,
      lastSessionDate: '2026-08-30',
      todayDate: '2026-09-01',
    });
    // The gap is two days, so the refilled freeze is spent at once.
    expect(result.freezeUsed).toBe(true);
    expect(result.freezesRemaining).toBe(FREEZES_PER_MONTH - 1);
    expect(result.streak).toBe(6);
  });

  it('fires milestones at exactly 3, 7, 14, 30, 60, 100', () => {
    for (const m of STREAK_MILESTONES) {
      const hit = updateStreak({
        ...base,
        currentStreak: m - 1,
        lastSessionDate: '2026-09-07',
        todayDate: '2026-09-08',
      });
      expect(hit.milestone).toBe(m);
      expect(milestoneInsight(m)).toBeGreaterThan(0);
    }
    const miss = updateStreak({
      ...base,
      currentStreak: 4,
      lastSessionDate: '2026-09-07',
      todayDate: '2026-09-08',
    });
    expect(miss.milestone).toBeNull();
  });

  it('works on local day keys, so a late-night session in UTC+8 keeps the streak', () => {
    // 2026-09-08 01:00 in Manila is still 2026-09-07 17:00 UTC. The caller
    // passes Manila's date, so the maths sees a clean consecutive day.
    expect(
      updateStreak({
        ...base,
        lastSessionDate: '2026-09-07',
        todayDate: '2026-09-08',
      }).streak,
    ).toBe(6);
  });
});

describe('streak edge cases', () => {
  it('resets after two missed days when no freeze is left', () => {
    expect(
      updateStreak({
        lastSessionDate: '2026-09-01',
        todayDate: '2026-09-03',
        currentStreak: 9,
        freezesRemaining: 0,
      }),
    ).toMatchObject({ streak: 1, freezeUsed: false, freezesRemaining: 0 });
  });

  it('resets after three missed days even with freezes', () => {
    expect(
      updateStreak({
        lastSessionDate: '2026-09-01',
        todayDate: '2026-09-04',
        currentStreak: 9,
        freezesRemaining: 2,
      }),
    ).toMatchObject({ streak: 1, freezeUsed: false, freezesRemaining: 2 });
  });

  it('treats a clock that went backwards as the same day', () => {
    expect(
      updateStreak({
        lastSessionDate: '2026-09-05',
        todayDate: '2026-09-04',
        currentStreak: 0,
        freezesRemaining: 1,
      }),
    ).toMatchObject({ streak: 1, milestone: null });
  });

  it('pays nothing for a non-milestone or a null milestone', () => {
    expect(milestoneInsight(null)).toBe(0);
    expect(milestoneInsight(5)).toBe(0);
    expect(milestoneInsight(7)).toBe(10);
  });
});
