import { countStages, examPace, memoryStage, weekDays } from './overview';

describe('memoryStage', () => {
  const day = (n: number) => new Date(Date.UTC(2026, 9, n, 9));
  const review = (n: number, rating = 3) => ({ reviewedAt: day(n), rating });

  it('is not started until the first review', () => {
    expect(memoryStage([], 0)).toBe('new');
  });

  it('starts over when an edit resets the schedule', () => {
    const old = [review(1), review(4), review(8)];
    // Reset, not reviewed since: not started, whatever the history says.
    expect(memoryStage(old, 0)).toBe('new');
    // One review of the new wording: only that one counts.
    expect(memoryStage([review(12), ...old], 1)).toBe('learning');
  });

  it('is learning when the schedule saw reviews the history lacks', () => {
    expect(memoryStage([], 4)).toBe('learning');
  });

  it('turns solid after three remembered reviews spanning a week', () => {
    expect(memoryStage([review(1), review(4), review(8)], 9)).toBe('solid');
    // Hard still counts as remembered.
    expect(memoryStage([review(1, 2), review(4), review(8, 4)], 9)).toBe(
      'solid',
    );
  });

  it('stays learning while the streak is short, crammed, or broken', () => {
    expect(memoryStage([review(1), review(8)], 9)).toBe('learning');
    expect(memoryStage([review(1), review(1), review(2)], 9)).toBe('learning');
    expect(memoryStage([review(1), review(4), review(8, 1)], 9)).toBe(
      'learning',
    );
  });

  it('judges only the latest three, in time order', () => {
    // A miss long ago no longer counts once three later reviews held.
    expect(
      memoryStage([review(20), review(1, 1), review(10), review(13)], 9),
    ).toBe('solid');
    // A recent miss breaks it whatever came before.
    expect(
      memoryStage([review(1), review(5), review(9), review(12, 1)], 9),
    ).toBe('learning');
  });

  it('counts each stage and the total', () => {
    expect(countStages(['new', 'solid', 'learning', 'solid'])).toEqual({
      total: 4,
      new: 1,
      learning: 1,
      solid: 2,
    });
  });
});

describe('examPace', () => {
  const base = { today: '2026-10-06', dailyNewLimit: 20 };

  it('needs an exam month still ahead', () => {
    expect(examPace({ ...base, examMonth: null, notStarted: 5 })).toBeNull();
    expect(
      examPace({ ...base, examMonth: '2026-10', notStarted: 5 }),
    ).toBeNull();
  });

  it('dates when the daily limit starts everything, and whether that is in time', () => {
    expect(
      examPace({ ...base, examMonth: '2027-03', notStarted: 340 }),
    ).toEqual({
      examStart: '2027-03-01',
      daysLeft: 146,
      startedAllBy: '2026-10-22',
      onPace: true,
      neededPerDay: 3,
    });
    const behind = examPace({ ...base, examMonth: '2026-11', notStarted: 900 });
    expect(behind).toMatchObject({
      daysLeft: 26,
      onPace: false,
      neededPerDay: 35,
    });
  });

  it('has nothing left to start once every card is underway', () => {
    expect(
      examPace({ ...base, examMonth: '2027-03', notStarted: 0 }),
    ).toMatchObject({ startedAllBy: null, onPace: true, neededPerDay: 0 });
  });

  it('treats a zero daily limit as one card a day', () => {
    expect(
      examPace({
        ...base,
        dailyNewLimit: 0,
        examMonth: '2026-11',
        notStarted: 10,
      }),
    ).toMatchObject({ startedAllBy: '2026-10-15', onPace: true });
  });
});

describe('weekDays', () => {
  it('marks study days and days still to come', () => {
    const days = weekDays({
      weekStart: '2026-10-05',
      today: '2026-10-06',
      active: new Set(['2026-10-05']),
    });
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({
      date: '2026-10-05',
      active: true,
      future: false,
    });
    expect(days[1]).toEqual({
      date: '2026-10-06',
      active: false,
      future: false,
    });
    expect(days[6]).toEqual({
      date: '2026-10-11',
      active: false,
      future: true,
    });
  });
});
