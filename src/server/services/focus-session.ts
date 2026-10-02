import { countedMs, isOverLimit } from '@/domain/session/elapsed';
import {
  startSessionRequestSchema,
  type StartSessionRequest,
} from '@/domain/types/session';
import { MAX_SESSIONS_PER_DAY } from '@/domain/session/constants';
import type {
  FocusSession,
  HeartbeatRequest,
  HeartbeatResult,
  SessionSnapshot,
} from '@/domain/types';
import { db } from '@/server/db';
import { isUniqueViolation } from '@/server/db/errors';
import { AppError } from '@/server/errors';
import {
  countSessionsSince,
  createFocusSession,
  findActiveSession,
  findSessionById,
  listActiveSessions,
} from '@/server/repositories/focus-session';
import { endSession } from './end-session';
import { startOfUserDay } from './local-day';

// The loot seed never leaves the server. Phase 5 rolls against it.
function toSnapshot(session: FocusSession): SessionSnapshot {
  return {
    sessionId: session.id,
    startedAt: session.startedAt.toISOString(),
    mode: session.mode ?? 'focus',
    readingLimitMs: session.readingLimitMs,
    focusedMs: countedMs(session, Date.now()),
  };
}

// Lazy settle. A session that has run past its limit has nothing more to
// count, so it is ended (and paid) the next time its owner comes back. There
// is no cron: an open session harms nobody in the meantime.
export async function settleExpiredSessions(
  userId: string,
  nowMs: number = Date.now(),
): Promise<void> {
  const active = await listActiveSessions(db, userId);
  for (const session of active) {
    if (!isOverLimit(session, nowMs)) continue;
    try {
      await endSession({ userId, sessionId: session.id });
    } catch (error) {
      // Someone else ended it first. Nothing to do.
      if (!(error instanceof AppError && error.code === 'INVALID_STATE'))
        throw error;
    }
  }
}

export async function getActiveSession(
  userId: string,
): Promise<SessionSnapshot | null> {
  await settleExpiredSessions(userId);
  const session = await findActiveSession(db, userId);
  return session ? toSnapshot(session) : null;
}

// Returns the existing session rather than erroring when one is already
// running. The partial unique index is the backstop for the race.
export async function startSession(
  userId: string,
  request: StartSessionRequest = { mode: 'focus' },
): Promise<SessionSnapshot> {
  const options = startSessionRequestSchema.parse(request);
  await settleExpiredSessions(userId);

  const existing = await findActiveSession(db, userId);
  if (existing) return toSnapshot(existing);

  const dayStart = await startOfUserDay(db, userId);
  const startedToday = await countSessionsSince(db, userId, dayStart);
  if (startedToday >= MAX_SESSIONS_PER_DAY) {
    throw new AppError(
      'RATE_LIMITED',
      `You've started ${MAX_SESSIONS_PER_DAY} sessions today. Take a break.`,
    );
  }

  try {
    const created = await createFocusSession(db, {
      userId,
      lootSeed: crypto.randomUUID(),
      mode: options.mode,
      ...(options.mode === 'reading'
        ? { readingLimitMs: options.minutes * 60_000 }
        : {}),
    });
    return toSnapshot(created);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await findActiveSession(db, userId);
    if (!raced) throw error;
    return toSnapshot(raced);
  }
}

// The open timer's check-in. It changes nothing: the time counted is read
// off the server clock, so a missed or replayed check-in cannot cost or
// earn a second. Anything else in the body is ignored.
export async function recordHeartbeat(
  input: HeartbeatRequest & { userId: string },
): Promise<HeartbeatResult> {
  const session = await findSessionById(db, input.sessionId);
  if (!session || session.userId !== input.userId) {
    throw new AppError('NOT_FOUND', 'Session not found');
  }
  if (session.status !== 'active')
    throw new AppError('INVALID_STATE', 'Session already ended');
  return { focusedMs: countedMs(session, Date.now()) };
}
