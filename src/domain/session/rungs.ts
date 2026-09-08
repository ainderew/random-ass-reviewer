import { MIN_SESSION_MS } from '@/domain/economy/constants';
import { calculateFocusAward } from '@/domain/economy/currency';
import {
  LENGTH_BONUS_START_MS,
  LENGTH_BONUS_STEP_MS,
  MIN_MS_FOR_CACHE,
  RARE_BONUS_CAP,
  RARE_BONUS_PER_STEP,
} from '@/domain/economy/loot-tables';

// The economy already has a story: minutes where something changes on the
// server. The study tab draws these as marks on the ring and says one short
// line as each is passed. Derived from the real constants, never retyped.
export type RungKind = 'counts' | 'chest' | 'odds' | 'odds-cap';

export interface Rung {
  atMs: number;
  kind: RungKind;
  label: string;
}

const ODDS_STEPS = Math.ceil(RARE_BONUS_CAP / RARE_BONUS_PER_STEP);

export const SESSION_RUNGS: readonly Rung[] = [
  { atMs: MIN_SESSION_MS, kind: 'counts', label: 'Counts now' },
  { atMs: MIN_MS_FOR_CACHE, kind: 'chest', label: 'Chest secured' },
  // The first bonus step lands one interval past the start, so 45, not 30.
  ...Array.from({ length: ODDS_STEPS }, (_, i): Rung => {
    const atMs = LENGTH_BONUS_START_MS + (i + 1) * LENGTH_BONUS_STEP_MS;
    const last = i === ODDS_STEPS - 1;
    return {
      atMs,
      kind: last ? 'odds-cap' : 'odds',
      label: last
        ? 'Odds at their best'
        : i === 0
          ? 'Rare odds up'
          : 'Odds up again',
    };
  }),
];

// Offered lengths, in minutes. Open means no shape beyond the rungs.
export const SESSION_LENGTHS_MIN = [25, 50] as const;
export type SessionLength = (typeof SESSION_LENGTHS_MIN)[number] | null;

export function rungsWithin(lengthMs: number | null): Rung[] {
  return SESSION_RUNGS.filter((r) => lengthMs === null || r.atMs <= lengthMs);
}

export function passedRungs(focusedMs: number): Rung[] {
  return SESSION_RUNGS.filter((r) => focusedMs >= r.atMs);
}

export function nextRung(
  focusedMs: number,
  lengthMs: number | null,
): Rung | null {
  return rungsWithin(lengthMs).find((r) => focusedMs < r.atMs) ?? null;
}

// The rung whose first minute we are in, so the note shows briefly and then
// goes quiet on its own with no timers to keep.
export function currentRungNote(focusedMs: number): Rung | null {
  const NOTE_MS = 60_000;
  return (
    SESSION_RUNGS.find(
      (r) => focusedMs >= r.atMs && focusedMs < r.atMs + NOTE_MS,
    ) ?? null
  );
}

// 0 to 1. A fixed length fills toward its end. An open session fills toward
// the next rung, so there is always something within reach.
export function ringProgress(
  focusedMs: number,
  lengthMs: number | null,
): number {
  if (lengthMs !== null) return clamp(focusedMs / lengthMs);
  const next = nextRung(focusedMs, null);
  if (!next) return 1;
  const prev = [...SESSION_RUNGS].reverse().find((r) => r.atMs <= focusedMs);
  const from = prev?.atMs ?? 0;
  return clamp((focusedMs - from) / (next.atMs - from));
}

// Where a rung sits on a fixed ring, 0 to 1 around the circumference.
export function rungPosition(rung: Rung, lengthMs: number | null): number {
  const span = lengthMs ?? SESSION_RUNGS[SESSION_RUNGS.length - 1]!.atMs;
  return clamp(rung.atMs / span);
}

// A courtesy figure, mirroring the server's formula. The credited number at
// the end is still the server's.
export function earningsSoFar(focusedMs: number): number {
  return calculateFocusAward({ creditedMs: focusedMs, multiplier: 1 });
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));
