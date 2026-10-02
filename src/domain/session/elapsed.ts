// A session counts on the server's clock from Start to End, whether or not
// Aloft is on screen: notes in a PDF app, a book beside a locked phone, and
// split view on the iPad are all studying. The client sends no time at all.
// The cap stops a timer left running overnight from paying for the night;
// the daily cap still applies on top.
export const MAX_SESSION_MS = 2 * 60 * 60_000;

// Reading blocks, from before they merged into focus sessions, kept the
// limit chosen at the start and never more than 30 minutes.
const MAX_READING_MS = 30 * 60_000;

export interface TimedSession {
  startedAt: Date;
  mode?: 'focus' | 'reading' | null;
  readingLimitMs?: number | null;
}

export function sessionLimitMs(session: TimedSession): number {
  return session.mode === 'reading'
    ? Math.min(session.readingLimitMs ?? 0, MAX_READING_MS)
    : MAX_SESSION_MS;
}

// Time that counts so far: never negative, never past the limit.
export function countedMs(session: TimedSession, nowMs: number): number {
  return Math.max(
    0,
    Math.min(nowMs - session.startedAt.getTime(), sessionLimitMs(session)),
  );
}

// Past its limit, a session has nothing more to count and can be settled.
export function isOverLimit(session: TimedSession, nowMs: number): boolean {
  return nowMs >= session.startedAt.getTime() + sessionLimitMs(session);
}
