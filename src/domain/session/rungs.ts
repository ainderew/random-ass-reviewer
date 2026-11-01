import { MIN_SESSION_MS } from '@/domain/economy/constants';
export type RungKind = 'counts';

export interface Rung {
  atMs: number;
  kind: RungKind;
  label: string;
}

export const SESSION_RUNGS: readonly Rung[] = [
  { atMs: MIN_SESSION_MS, kind: 'counts', label: 'Streak day earned' },
];

// Offered lengths, in minutes. Open means no shape beyond the rungs.
export const SESSION_LENGTHS_MIN = [5, 15, 25, 50] as const;
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

const clamp = (n: number) => Math.min(1, Math.max(0, n));
