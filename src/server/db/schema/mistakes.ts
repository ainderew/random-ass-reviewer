import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { focusSessions } from './sessions';
export const mistakeChecks = pgTable(
  'mistake_checks',
  {
    id: uuid('id').primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => focusSessions.id, { onDelete: 'cascade' }),
    cardId: uuid('card_id').notNull(),
    optionIndex: integer('option_index').notNull(),
    correct: boolean('correct').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('mistake_checks_question_idx').on(
      t.sessionId,
      t.cardId,
      t.answeredAt,
    ),
  ],
);
