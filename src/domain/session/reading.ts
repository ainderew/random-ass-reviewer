// Reading is self-reported elapsed study time, bounded by a server-stored limit.
export function readingElapsedMs(
  startedAtMs: number,
  nowMs: number,
  limitMs: number,
): number {
  return Math.max(0, Math.min(nowMs - startedAtMs, limitMs, 30 * 60_000));
}
