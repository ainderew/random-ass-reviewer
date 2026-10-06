const DAY = 86_400_000;

// Solid is a rule a student can check against their own memory: remembered
// the last three times in a row, and those three reviews span a week or more,
// so one evening of cramming cannot make a card solid. A display rule, not a
// research threshold.
export const SOLID_STREAK = 3;
export const SOLID_SPAN_DAYS = 7;

export type MemoryStage = 'new' | 'learning' | 'solid';

// Remembered is anything but Again; a wrong multiple-choice pick is always
// rated Again. `repsSinceReset` is the schedule's review count, which an edit
// to the question or answer resets to 0: reviews of the old wording stop
// counting, and the card is not started again, as the schedule treats it.
export function memoryStage(
  recent: ReadonlyArray<{ reviewedAt: Date; rating: number }>,
  repsSinceReset: number,
): MemoryStage {
  if (repsSinceReset === 0) return 'new';
  const last = [...recent]
    .sort((a, b) => b.reviewedAt.getTime() - a.reviewedAt.getTime())
    .slice(0, Math.min(repsSinceReset, SOLID_STREAK));
  if (last.length < SOLID_STREAK || last.some((r) => r.rating === 1))
    return 'learning';
  const span =
    last[0]!.reviewedAt.getTime() - last[last.length - 1]!.reviewedAt.getTime();
  return span >= SOLID_SPAN_DAYS * DAY ? 'solid' : 'learning';
}

export interface StageCounts {
  total: number;
  new: number;
  learning: number;
  solid: number;
}

export function countStages(stages: readonly MemoryStage[]): StageCounts {
  const counts: StageCounts = { total: 0, new: 0, learning: 0, solid: 0 };
  for (const stage of stages) {
    counts.total += 1;
    counts[stage] += 1;
  }
  return counts;
}

export interface ExamPace {
  // 'YYYY-MM-01'. The sitting's exact day is unknown, so the month's first day
  // is the deadline: the conservative reading.
  examStart: string;
  daysLeft: number;
  // Null when every card has been started.
  startedAllBy: string | null;
  onPace: boolean;
  // New cards a day that would start everything before the exam.
  neededPerDay: number;
}

const toUtc = (key: string) => Date.parse(`${key}T00:00:00Z`);
const toKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Calendar arithmetic on local day keys, so a time zone never shifts a day.
export function examPace(input: {
  examMonth: string | null;
  today: string;
  notStarted: number;
  dailyNewLimit: number;
}): ExamPace | null {
  if (!input.examMonth) return null;
  const examStart = `${input.examMonth}-01`;
  const daysLeft = Math.round((toUtc(examStart) - toUtc(input.today)) / DAY);
  if (daysLeft <= 0) return null;
  const limit = Math.max(1, input.dailyNewLimit);
  const daysNeeded = Math.ceil(input.notStarted / limit);
  return {
    examStart,
    daysLeft,
    startedAllBy:
      input.notStarted === 0
        ? null
        : toKey(toUtc(input.today) + (daysNeeded - 1) * DAY),
    onPace: daysNeeded <= daysLeft,
    neededPerDay: Math.ceil(input.notStarted / daysLeft),
  };
}

// Monday to Sunday of the week starting `weekStart`, marked by activity.
export function weekDays(input: {
  weekStart: string;
  today: string;
  active: ReadonlySet<string>;
}): Array<{ date: string; active: boolean; future: boolean }> {
  return Array.from({ length: 7 }, (_, i) => {
    const date = toKey(toUtc(input.weekStart) + i * DAY);
    return {
      date,
      active: input.active.has(date),
      future: date > input.today,
    };
  });
}
