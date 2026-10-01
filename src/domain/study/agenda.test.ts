import {
  actionFor,
  catLine,
  currentStep,
  dayAgenda,
  type AgendaInput,
} from './agenda';

const batches = (total: number) => ({
  5: { total: Math.min(total, 6), returning: 0, fresh: 0 },
  15: { total, returning: 0, fresh: 0 },
  30: { total, returning: 0, fresh: 0 },
});

const day = (
  over: Partial<AgendaInput> = {},
  plan: Partial<AgendaInput['plan']> = {},
): AgendaInput => ({
  plan: {
    batches: batches(18),
    reviewedToday: 0,
    approved: 40,
    mistakesDue: 0,
    ...plan,
  },
  size: 15,
  focusTodayMs: 0,
  catName: 'Toast',
  ...over,
});

const MIN = 60_000;

describe('dayAgenda', () => {
  it('starts with the review, then focus', () => {
    const steps = dayAgenda(day());
    expect(steps.map((s) => [s.id, s.state, s.detail])).toEqual([
      ['review', 'now', '18 cards'],
      ['focus', 'later', '25 min'],
    ]);
    expect(steps[0]!.href).toBe('/review?minutes=15');
  });

  it('puts due retries between the review and focus', () => {
    const steps = dayAgenda(day({}, { mistakesDue: 1 }));
    expect(steps.map((s) => s.id)).toEqual(['review', 'retry', 'focus']);
    expect(steps[1]).toMatchObject({
      detail: '1 question',
      href: '/review/mistakes',
    });
  });

  it('moves on once the cards are done, and says how many', () => {
    const steps = dayAgenda(
      day({}, { batches: batches(0), reviewedToday: 12 }),
    );
    expect(steps[0]).toMatchObject({ state: 'done', detail: '12 done' });
    expect(currentStep(steps)?.id).toBe('focus');
  });

  it('counts a quiet day with nothing due as done', () => {
    const steps = dayAgenda(day({}, { batches: batches(0) }));
    expect(steps[0]).toMatchObject({ state: 'done', detail: 'Nothing due' });
  });

  it('follows the chosen review size', () => {
    expect(dayAgenda(day({ size: 5 }))[0]!.detail).toBe('6 cards');
  });

  it('shows focus progress and marks it done at 25 minutes', () => {
    const partial = dayAgenda(
      day({ focusTodayMs: 10 * MIN }, { batches: batches(0) }),
    );
    expect(partial[1]).toMatchObject({ state: 'now', detail: '10 of 25 min' });
    const full = dayAgenda(
      day({ focusTodayMs: 31 * MIN }, { batches: batches(0) }),
    );
    expect(full[1]).toMatchObject({ state: 'done', detail: '31 min today' });
    expect(currentStep(full)).toBeNull();
  });

  it('asks for notes first when there are no cards yet', () => {
    const steps = dayAgenda(day({}, { approved: 0, batches: batches(0) }));
    expect(steps.map((s) => [s.id, s.state])).toEqual([
      ['notes', 'now'],
      ['focus', 'later'],
    ]);
  });
});

describe('catLine', () => {
  const quiet = { missesYou: false, focusing: false };

  it('says the next thing in a few words', () => {
    expect(catLine(dayAgenda(day()), quiet)).toBe('18 cards to review first.');
    expect(
      catLine(
        dayAgenda(day({}, { batches: batches(0), mistakesDue: 2 })),
        quiet,
      ),
    ).toBe('2 questions to retry.');
    expect(catLine(dayAgenda(day({}, { batches: batches(0) })), quiet)).toBe(
      'Now focus with me for 25 min.',
    );
    expect(
      catLine(
        dayAgenda(day({ focusTodayMs: 10 * MIN }, { batches: batches(0) })),
        quiet,
      ),
    ).toBe('10 of 25 min of focus so far. More?');
    expect(catLine(dayAgenda(day({}, { approved: 0 })), quiet)).toBe(
      'Add your notes and we can start.',
    );
  });

  it('celebrates a finished day', () => {
    const steps = dayAgenda(
      day({ focusTodayMs: 30 * MIN }, { batches: batches(0) }),
    );
    expect(catLine(steps, quiet)).toBe("That's today. I'm proud of you.");
  });

  it('says she missed you, and points at a running session', () => {
    expect(
      catLine(dayAgenda(day()), { missesYou: true, focusing: false }),
    ).toBe('I missed you! 18 cards to review first.');
    expect(
      catLine(dayAgenda(day()), { missesYou: false, focusing: true }),
    ).toBe('We are focusing. Back to the timer?');
  });
});

describe('actionFor', () => {
  it('names the button for the step', () => {
    const steps = dayAgenda(day({}, { mistakesDue: 1 }));
    expect(actionFor(steps[0]!)).toEqual({
      label: 'Start review',
      href: '/review?minutes=15',
    });
    expect(actionFor(steps[1]!)?.label).toBe('Retry questions');
    expect(actionFor(steps[2]!)?.label).toBe('Start focusing');
    expect(actionFor({ ...steps[0]!, id: 'notes' })?.label).toBe('Add notes');
    expect(actionFor(null)).toBeNull();
  });
});
