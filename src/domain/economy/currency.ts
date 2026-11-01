import { DAILY_CREDITABLE_MS } from './constants';

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
