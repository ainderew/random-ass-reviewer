import {
  HEARTBEAT_INTERVAL_MS,
  MAX_BEAT_GAP_MS,
  MIN_BEAT_GAP_MS,
  STALE_SESSION_MS,
} from './constants';

export interface BeatSample {
  atMs: number;
  focused: boolean;
}

// Credit for the gap after a beat. Only the earlier beat's focus flag matters:
// it describes the interval that followed it.
export function creditForGap(gapMs: number, earlierFocused: boolean): number {
  if (!earlierFocused || gapMs <= 0) return 0;
  return gapMs <= MAX_BEAT_GAP_MS ? gapMs : HEARTBEAT_INTERVAL_MS;
}

// Sum of focused gaps between consecutive beats. One beat, or none, is zero.
export function accumulateFocusedMs(beats: ReadonlyArray<BeatSample>): number {
  let total = 0;
  for (let i = 1; i < beats.length; i += 1) {
    const earlier = beats[i - 1];
    const later = beats[i];
    if (!earlier || !later) continue;
    total += creditForGap(later.atMs - earlier.atMs, earlier.focused);
  }
  return total;
}

export type BeatVerdict =
  { ok: true } | { ok: false; reason: 'OUT_OF_ORDER' | 'TOO_FAST' };

// seq must climb, and beats must not arrive faster than half the interval.
// The second rule is what stops 200 beats in one second from paying.
export function isValidNextBeat(input: {
  lastSeq: number | null;
  nextSeq: number;
  lastAtMs: number | null;
  nowMs: number;
}): BeatVerdict {
  const { lastSeq, nextSeq, lastAtMs, nowMs } = input;
  if (lastSeq !== null && nextSeq <= lastSeq)
    return { ok: false, reason: 'OUT_OF_ORDER' };
  if (lastAtMs !== null && nowMs - lastAtMs < MIN_BEAT_GAP_MS) {
    return { ok: false, reason: 'TOO_FAST' };
  }
  return { ok: true };
}

export function isStale(input: {
  lastActivityMs: number;
  nowMs: number;
}): boolean {
  return input.nowMs - input.lastActivityMs > STALE_SESSION_MS;
}
