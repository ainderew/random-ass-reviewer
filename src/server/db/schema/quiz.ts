import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { StoredQuizQuestion } from '@/domain/types/review';
import { focusSessions } from './sessions';

export const sessionQuizQuestions = pgTable(
  'session_quiz_questions',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => focusSessions.id, { onDelete: 'cascade' }),
    // Deliberately no card FK: historical grading survives source edits/deletion.
    cardId: uuid('card_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    snapshot: jsonb('snapshot').$type<StoredQuizQuestion>().notNull(),
    optionIndex: integer('option_index'),
    correct: boolean('correct'),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.cardId] })],
);
