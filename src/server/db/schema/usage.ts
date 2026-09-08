import { integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const llmUsage = pgTable(
  'llm_usage',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // 'YYYY-MM'
    month: text('month').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    costCents: integer('cost_cents').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.month] })],
);
