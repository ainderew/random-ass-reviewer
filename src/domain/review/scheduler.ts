import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card as FsrsCard,
  type Grade,
} from 'ts-fsrs';
import { fsrsStateSchema, type FsrsState, type Rating } from '@/domain/types';

// The only file that imports ts-fsrs. Everything else sees FsrsState (the
// JSON-safe card) and these functions. `nowMs` is always a parameter so a
// test can walk a card through ninety days without touching the clock.
const scheduler = fsrs(
  generatorParameters({ request_retention: 0.9, enable_fuzz: true }),
);

const DAY_MS = 24 * 60 * 60 * 1000;

function toState(card: FsrsCard): FsrsState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

function toCard(state: FsrsState): FsrsCard {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    learning_steps: state.learning_steps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    ...(state.last_review ? { last_review: new Date(state.last_review) } : {}),
  };
}

export function initialCardState(nowMs: number): FsrsState {
  return toState(createEmptyCard(new Date(nowMs)));
}

// A corrupt or outdated blob resets the card rather than crashing the queue.
export function parseState(raw: unknown, nowMs: number): FsrsState {
  const parsed = fsrsStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : initialCardState(nowMs);
}

export interface ScheduledReview {
  state: FsrsState;
  nextDueAtMs: number;
  intervalDays: number;
}

export function scheduleReview(input: {
  state: FsrsState;
  rating: Rating;
  nowMs: number;
}): ScheduledReview {
  const now = new Date(input.nowMs);
  const item = scheduler.next(toCard(input.state), now, input.rating as Grade);
  const nextDueAtMs = item.card.due.getTime();
  return {
    state: toState(item.card),
    nextDueAtMs,
    intervalDays: (nextDueAtMs - input.nowMs) / DAY_MS,
  };
}

// Projected interval for each rating, in days (fractional under a day).
// Shown on the rating buttons so the algorithm is legible, not arbitrary.
export function previewIntervals(input: {
  state: FsrsState;
  nowMs: number;
}): Record<Rating, number> {
  const preview = scheduler.repeat(toCard(input.state), new Date(input.nowMs));
  const days = (grade: Grade) =>
    (preview[grade].card.due.getTime() - input.nowMs) / DAY_MS;
  return { 1: days(1), 2: days(2), 3: days(3), 4: days(4) };
}
