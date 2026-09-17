import type { QueuedCard } from '@/domain/types';
export const STUDY_BUDGETS = [5, 15, 30] as const;
export type StudyBudget = (typeof STUDY_BUDGETS)[number];
export function studyBudget(value: unknown): StudyBudget | null {
  const n = Number(value);
  return n === 5 || n === 15 || n === 30 ? n : null;
}
// A starting estimate, not a countdown or a promise about learning speed.
// Previously studied cards take priority; new cards fill only remaining room.
export function reviewBatch(
  cards: QueuedCard[],
  minutes: StudyBudget,
): QueuedCard[] {
  const limit = { 5: 6, 15: 18, 30: 36 }[minutes];
  return [...cards]
    .sort(
      (a, b) =>
        Number(a.isNew) - Number(b.isNew) ||
        new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    )
    .slice(0, limit);
}
export interface TodayPlan {
  batches: Record<
    StudyBudget,
    { total: number; returning: number; fresh: number }
  >;
  reviewedToday: number;
  approved: number;
  mistakesDue: number;
  nextMistakeAt: string | null;
  examMonth: string | null;
}
