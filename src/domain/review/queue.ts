import { createRng } from '@/domain/economy/rng';
import {
  MAX_NEW_CARDS_PER_DAY,
  MAX_REVIEWS_PER_SESSION,
  OVERDUE_AFTER_MS,
} from './constants';

export interface CardSummary {
  id: string;
  nextDueAtMs: number;
}

// Overdue first (most overdue leading), then new cards up to the daily cap,
// then the rest of what is due. Capped: "347 due" after a week away is how
// people quit spaced repetition.
export function selectQueue<T extends CardSummary>(input: {
  due: T[];
  newCards: T[];
  newCardsSeenToday: number;
  nowMs: number;
}): T[] {
  const byDue = [...input.due].sort((a, b) => a.nextDueAtMs - b.nextDueAtMs);
  const overdue = byDue.filter(
    (c) => input.nowMs - c.nextDueAtMs >= OVERDUE_AFTER_MS,
  );
  const dueToday = byDue.filter(
    (c) => input.nowMs - c.nextDueAtMs < OVERDUE_AFTER_MS,
  );
  const newAllowance = Math.max(
    0,
    MAX_NEW_CARDS_PER_DAY - input.newCardsSeenToday,
  );
  const fresh = input.newCards.slice(0, newAllowance);
  return [...overdue, ...fresh, ...dueToday].slice(0, MAX_REVIEWS_PER_SESSION);
}

// Seeded, so a refresh mid-quiz shows the same questions.
export function selectQuizCards<T extends { id: string }>(input: {
  candidates: readonly T[];
  count: number;
  seed: string;
}): T[] {
  const rng = createRng(input.seed);
  const pool = [...input.candidates].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, input.count);
}

// Deterministic shuffle for quiz options: the same seed always yields the
// same order, which lets the server grade by index without storing anything.
export function shuffleWithSeed<T>(items: readonly T[], seed: string): T[] {
  const rng = createRng(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
