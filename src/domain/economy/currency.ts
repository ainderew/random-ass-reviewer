import { DAILY_CREDITABLE_MS, FOCUS_PER_MINUTE } from './constants';

const MS_PER_MINUTE = 60 * 1000;

// Focus paid for credited time. Whole minutes only, rounded down. The
// minimum-session rule lives in the session service, on focused time, so a
// daily cap that trims a long session cannot zero it out.
export function calculateFocusAward(input: {
  creditedMs: number;
  multiplier: number;
}): number {
  const { creditedMs, multiplier } = input;
  if (creditedMs <= 0 || multiplier <= 0) return 0;
  const minutes = Math.floor(creditedMs / MS_PER_MINUTE);
  return Math.floor(minutes * FOCUS_PER_MINUTE * multiplier);
}

// How much of a session's focused time may still be credited today. Never negative.
export function applyDailyCap(input: {
  focusedMs: number;
  alreadyCreditedTodayMs: number;
  // A user may lower the cap, never raise it.
  capMs?: number;
}): number {
  const focusedMs = Math.max(0, input.focusedMs);
  const capMs = Math.min(
    input.capMs ?? DAILY_CREDITABLE_MS,
    DAILY_CREDITABLE_MS,
  );
  const remainingMs = capMs - Math.max(0, input.alreadyCreditedTodayMs);
  if (remainingMs <= 0) return 0;
  return Math.min(focusedMs, remainingMs);
}
