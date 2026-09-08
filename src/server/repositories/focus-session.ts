import { and, count, desc, eq, gte, isNull, sql, sum } from 'drizzle-orm';
import type { FocusSession, SessionStatus } from '@/domain/types';
import type { DbOrTx } from '@/server/db';
import { focusSessions } from '@/server/db/schema';

type SessionRow = typeof focusSessions.$inferSelect;

function toFocusSession(row: SessionRow): FocusSession {
  return {
    id: row.id,
    userId: row.userId,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    focusedMs: row.focusedMs,
    creditedMs: row.creditedMs,
    lootSeed: row.lootSeed,
    status: row.status,
    quizMultiplier: Number(row.quizMultiplier),
    quizSubmittedAt: row.quizSubmittedAt ?? null,
  };
}

// startedAt is the server clock. The partial unique index rejects a second
// active session for the same user.
export async function createFocusSession(
  tx: DbOrTx,
  input: { userId: string; lootSeed: string },
): Promise<FocusSession> {
  const [row] = await tx
    .insert(focusSessions)
    .values({
      userId: input.userId,
      lootSeed: input.lootSeed,
      startedAt: new Date(),
    })
    .returning();
  if (!row) throw new Error('createFocusSession returned no row');
  return toFocusSession(row);
}

export async function findActiveSession(
  tx: DbOrTx,
  userId: string,
): Promise<FocusSession | null> {
  const row = await tx.query.focusSessions.findFirst({
    where: and(
      eq(focusSessions.userId, userId),
      eq(focusSessions.status, 'active'),
    ),
  });
  return row ? toFocusSession(row) : null;
}

// Normally zero or one row thanks to the index; an array keeps the sweeper honest.
export async function listActiveSessions(
  tx: DbOrTx,
  userId: string,
): Promise<FocusSession[]> {
  const rows = await tx
    .select()
    .from(focusSessions)
    .where(
      and(eq(focusSessions.userId, userId), eq(focusSessions.status, 'active')),
    )
    .limit(10);
  return rows.map(toFocusSession);
}

export async function findSessionById(
  tx: DbOrTx,
  id: string,
): Promise<FocusSession | null> {
  const row = await tx.query.focusSessions.findFirst({
    where: eq(focusSessions.id, id),
  });
  return row ? toFocusSession(row) : null;
}

// Flip active -> completed in one conditional update. Two concurrent enders
// both wait on the row lock; the second sees no active row and gets null.
export async function claimSessionForEnd(
  tx: DbOrTx,
  input: { sessionId: string; userId: string; endedAt: Date },
): Promise<FocusSession | null> {
  const [row] = await tx
    .update(focusSessions)
    .set({ status: 'completed', endedAt: input.endedAt })
    .where(
      and(
        eq(focusSessions.id, input.sessionId),
        eq(focusSessions.userId, input.userId),
        eq(focusSessions.status, 'active'),
      ),
    )
    .returning();
  return row ? toFocusSession(row) : null;
}

export async function updateFocusSession(
  tx: DbOrTx,
  id: string,
  patch: Partial<{
    endedAt: Date;
    focusedMs: number;
    creditedMs: number;
    status: SessionStatus;
    quizMultiplier: number;
  }>,
): Promise<FocusSession | null> {
  const { quizMultiplier, ...rest } = patch;
  const [row] = await tx
    .update(focusSessions)
    .set({
      ...rest,
      ...(quizMultiplier === undefined
        ? {}
        : { quizMultiplier: quizMultiplier.toFixed(2) }),
    })
    .where(eq(focusSessions.id, id))
    .returning();
  return row ? toFocusSession(row) : null;
}

// SQL-side increment for the live focused counter. Returns the new total.
export async function incrementFocusedMs(
  tx: DbOrTx,
  sessionId: string,
  deltaMs: number,
): Promise<number> {
  const [row] = await tx
    .update(focusSessions)
    .set({
      focusedMs: sql`${focusSessions.focusedMs} + ${Math.max(0, Math.round(deltaMs))}`,
    })
    .where(eq(focusSessions.id, sessionId))
    .returning({ focusedMs: focusSessions.focusedMs });
  return row?.focusedMs ?? 0;
}

export async function countSessionsSince(
  tx: DbOrTx,
  userId: string,
  since: Date,
): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.startedAt, since),
      ),
    );
  return row?.value ?? 0;
}

// Credited time on sessions that ended since `since`. Drives the daily cap.
export async function sumCreditedSince(
  tx: DbOrTx,
  userId: string,
  since: Date,
): Promise<number> {
  const [row] = await tx
    .select({ value: sum(focusSessions.creditedMs) })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        eq(focusSessions.status, 'completed'),
        gte(focusSessions.endedAt, since),
      ),
    );
  return Number(row?.value ?? 0);
}

// All-time credited time. Drives the study shelf.
export async function sumCreditedAllTime(
  tx: DbOrTx,
  userId: string,
): Promise<number> {
  const [row] = await tx
    .select({ value: sum(focusSessions.creditedMs) })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        eq(focusSessions.status, 'completed'),
      ),
    );
  return Number(row?.value ?? 0);
}

// Completed sessions that ended since `since`, newest first, for summaries.
export async function listCompletedSince(
  tx: DbOrTx,
  userId: string,
  since: Date,
): Promise<FocusSession[]> {
  const rows = await tx
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        eq(focusSessions.status, 'completed'),
        gte(focusSessions.endedAt, since),
      ),
    )
    .orderBy(desc(focusSessions.endedAt))
    .limit(500);
  return rows.map(toFocusSession);
}

// Single-write guard for the quiz: only an active session that has not been
// quizzed can take a multiplier, and only once. Concurrent submits lose here.
export async function claimQuizMultiplier(
  tx: DbOrTx,
  input: {
    sessionId: string;
    userId: string;
    multiplier: number;
    correct: number;
    total: number;
  },
): Promise<FocusSession | null> {
  const [row] = await tx
    .update(focusSessions)
    .set({
      quizMultiplier: input.multiplier.toFixed(2),
      quizSubmittedAt: new Date(),
      quizCorrect: input.correct,
      quizTotal: input.total,
    })
    .where(
      and(
        eq(focusSessions.id, input.sessionId),
        eq(focusSessions.userId, input.userId),
        eq(focusSessions.status, 'active'),
        isNull(focusSessions.quizSubmittedAt),
      ),
    )
    .returning();
  return row ? toFocusSession(row) : null;
}

// Quizzes finished at a high grade, lifetime. The career ladder counts these.
export async function countHighGradeQuizzes(
  tx: DbOrTx,
  userId: string,
): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        sql`${focusSessions.quizTotal} > 0`,
        sql`${focusSessions.quizCorrect} * 4 >= ${focusSessions.quizTotal} * 3`,
      ),
    );
  return row?.value ?? 0;
}
