import { localDayKey } from '@/domain/time/local-day';
export interface ProgressReview {
  cardId: string;
  reviewedAt: Date;
  rating: number;
  practiceType: 'recall' | 'write' | 'choice' | null;
  correct: boolean | null;
  delayDays: number | null;
  subject: string | null;
}
export interface ScoreCount {
  correct: number;
  total: number;
}
export interface ProgressWeek {
  start: string;
  end: string;
  choices: ScoreCount;
  delayedChoices: ScoreCount;
  delayedRecall: ScoreCount;
  reviews: number;
}
export interface LearningProgress {
  weeks: ProgressWeek[];
  choices: ScoreCount;
  delayedChoices: ScoreCount;
  delayedRecall: ScoreCount;
  activeDays: number;
  reviews: number;
  repeatedMisses: number;
  subjects: { subject: string | null; choices: ScoreCount; cards: number }[];
}
const DAY = 86400000;
const empty = (): ScoreCount => ({ correct: 0, total: 0 });
export function learningProgress(
  rows: ProgressReview[],
  nowMs: number,
  zone: string,
): LearningProgress {
  const today = Date.parse(localDayKey(nowMs, zone));
  const first = today - 27 * DAY;
  const key = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const weeks: ProgressWeek[] = Array.from({ length: 4 }, (_, i) => ({
    start: key(first + i * 7 * DAY),
    end: key(first + (i * 7 + 6) * DAY),
    choices: empty(),
    delayedChoices: empty(),
    delayedRecall: empty(),
    reviews: 0,
  }));
  const result: LearningProgress = {
    weeks,
    choices: empty(),
    delayedChoices: empty(),
    delayedRecall: empty(),
    activeDays: 0,
    reviews: 0,
    repeatedMisses: 0,
    subjects: [],
  };
  const days = new Set<string>();
  const firstAttempts = new Set<string>();
  const misses = new Map<string, Set<string>>();
  const subjects = new Map<
    string | null,
    { choices: ScoreCount; cards: Set<string> }
  >();
  // Only the first completed review per card/local day contributes to scores.
  // Same-day reattempts still count as practice activity, not extra mastery evidence.
  for (const row of [...rows].sort(
    (a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime(),
  )) {
    const day = localDayKey(row.reviewedAt.getTime(), zone);
    const index = Math.floor((Date.parse(day) - first) / (7 * DAY));
    if (index < 0 || index > 3 || row.reviewedAt.getTime() > nowMs) continue;
    const week = weeks[index]!;
    week.reviews++;
    result.reviews++;
    days.add(day);
    const attempt = `${row.cardId}:${day}`;
    if (firstAttempts.has(attempt)) continue;
    firstAttempts.add(attempt);
    const add = (counts: ScoreCount[], correct: boolean) =>
      counts.forEach((c) => {
        c.total++;
        c.correct += Number(correct);
      });
    if (row.practiceType === 'choice' && row.correct !== null) {
      add([week.choices, result.choices], row.correct);
      if ((row.delayDays ?? 0) >= 7)
        add([week.delayedChoices, result.delayedChoices], row.correct);
      const subject = subjects.get(row.subject) ?? {
        choices: empty(),
        cards: new Set<string>(),
      };
      add([subject.choices], row.correct);
      subject.cards.add(row.cardId);
      subjects.set(row.subject, subject);
      if (!row.correct) {
        const missed = misses.get(row.cardId) ?? new Set<string>();
        missed.add(day);
        misses.set(row.cardId, missed);
      }
    }
    if (
      (row.practiceType === 'recall' || row.practiceType === 'write') &&
      (row.delayDays ?? 0) >= 7
    )
      add([week.delayedRecall, result.delayedRecall], row.rating >= 3);
  }
  result.activeDays = days.size;
  result.repeatedMisses = [...misses.values()].filter(
    (d) => d.size >= 2,
  ).length;
  result.subjects = [...subjects]
    .map(([subject, value]) => ({
      subject,
      choices: value.choices,
      cards: value.cards.size,
    }))
    .sort((a, b) => b.choices.total - a.choices.total);
  return result;
}
