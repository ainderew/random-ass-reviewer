import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { SESSION_STATUSES } from '@/domain/types/session';
import { users } from './auth';

export const sessionStatus = pgEnum('session_status', SESSION_STATUSES);

export const focusSessions = pgTable(
  'focus_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Server clock, never the client's.
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    // Accumulated from validated heartbeats.
    focusedMs: integer('focused_ms').notNull().default(0),
    // After daily caps are applied.
    creditedMs: integer('credited_ms').notNull().default(0),
    // Generated server-side at start; the client cannot reroll it.
    lootSeed: text('loot_seed').notNull(),
    status: sessionStatus('status').notNull().default('active'),
    // Set by the post-session quiz (Phase 7).
    quizMultiplier: numeric('quiz_multiplier', { precision: 3, scale: 2 })
      .notNull()
      .default('1.00'),
    // Set once by the quiz. The multiplier alone cannot mark 'taken': 6 of 8
    // earns exactly 1.00, the same as never trying.
    quizSubmittedAt: timestamp('quiz_submitted_at', { withTimezone: true }),
    // The score behind the multiplier. A high grade is 75% or better.
    quizCorrect: integer('quiz_correct'),
    quizTotal: integer('quiz_total'),
  },
  (t) => [
    index('focus_sessions_user_started_idx').on(t.userId, t.startedAt.desc()),
    // One active session per user, guaranteed by the database.
    uniqueIndex('focus_sessions_one_active')
      .on(t.userId)
      .where(sql`${t.status} = 'active'`),
  ],
);

// Append-only. Never updated. The composite key turns a replayed `seq` into a
// constraint violation instead of free currency.
export const sessionHeartbeats = pgTable(
  'session_heartbeats',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => focusSessions.id, { onDelete: 'cascade' }),
    // Monotonic per session.
    seq: integer('seq').notNull(),
    // Server receipt time.
    at: timestamp('at', { withTimezone: true }).notNull(),
    // Was the tab visible and focused.
    focused: boolean('focused').notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.seq] })],
);
