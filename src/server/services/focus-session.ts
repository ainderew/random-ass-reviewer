import { MAX_SESSIONS_PER_DAY } from '@/domain/session/constants';
import {
  creditForGap,
  isStale,
  isValidNextBeat,
} from '@/domain/session/validation';
import type {
  FocusSession,
  HeartbeatRequest,
  HeartbeatResult,
  SessionSnapshot,
} from '@/domain/types';
import { db, type DbOrTx } from '@/server/db';
import { isUniqueViolation } from '@/server/db/errors';
import { AppError } from '@/server/errors';
import {
  countSessionsSince,
  createFocusSession,
  findActiveSession,
  findSessionById,
  incrementFocusedMs,
  listActiveSessions,
} from '@/server/repositories/focus-session';
import {
  getLastHeartbeat,
  insertHeartbeat,
} from '@/server/repositories/heartbeat';
import { endSession } from './end-session';
import { startOfUserDay } from './local-day';

// The loot seed never leaves the server. Phase 5 rolls against it.
async function toSnapshot(
  tx: DbOrTx,
  session: FocusSession,
): Promise<SessionSnapshot> {
  const last = await getLastHeartbeat(tx, session.id);
  return {
    sessionId: session.id,
    startedAt: session.startedAt.toISOString(),
    focusedMs: session.focusedMs,
    lastSeq: last?.seq ?? null,
  };
}

// Lazy sweep. A crashed session harms nobody until its owner comes back, so
// there is no cron. Credit stops at the last heartbeat because that is all
// the accumulator can see.
export async function sweepStaleSessions(
  userId: string,
  nowMs: number = Date.now(),
): Promise<void> {
  const active = await listActiveSessions(db, userId);
  for (const session of active) {
    const last = await getLastHeartbeat(db, session.id);
    const lastActivityMs = (last?.at ?? session.startedAt).getTime();
    if (!isStale({ lastActivityMs, nowMs })) continue;
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
  await sweepStaleSessions(userId);
  const session = await findActiveSession(db, userId);
  return session ? toSnapshot(db, session) : null;
}

// Returns the existing session rather than erroring when one is already
// running. The partial unique index is the backstop for the race.
export async function startSession(userId: string): Promise<SessionSnapshot> {
  await sweepStaleSessions(userId);

  const existing = await findActiveSession(db, userId);
  if (existing) return toSnapshot(db, existing);

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
    });
    return toSnapshot(db, created);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const raced = await findActiveSession(db, userId);
    if (!raced) throw error;
    return toSnapshot(db, raced);
  }
}

// Invalid cadence is dropped silently with a 200. Legitimate users hit it
// during clock adjustments and must never see an error for it.
export async function recordHeartbeat(
  input: HeartbeatRequest & { userId: string },
): Promise<HeartbeatResult> {
  return db.transaction(async (tx) => {
    const session = await findSessionById(tx, input.sessionId);
    if (!session || session.userId !== input.userId) {
      throw new AppError('NOT_FOUND', 'Session not found');
    }
    if (session.status !== 'active')
      throw new AppError('INVALID_STATE', 'Session already ended');

    const last = await getLastHeartbeat(tx, session.id);
    const nowMs = Date.now();
    const verdict = isValidNextBeat({
      lastSeq: last?.seq ?? null,
      nextSeq: input.seq,
      lastAtMs: last?.at.getTime() ?? null,
      nowMs,
    });
    if (!verdict.ok) return { focusedMs: session.focusedMs };

    const inserted = await insertHeartbeat(tx, {
      sessionId: session.id,
      seq: input.seq,
      focused: input.focused,
    });
    if (!inserted) return { focusedMs: session.focusedMs };

    const delta = last
      ? creditForGap(inserted.at.getTime() - last.at.getTime(), last.focused)
      : 0;
    const focusedMs = await incrementFocusedMs(tx, session.id, delta);
    return { focusedMs };
  });
}
