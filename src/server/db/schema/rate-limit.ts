import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './auth';

// Fixed-window counters, one row per user and bucket. Postgres is plenty at
// this scale; Redis would be more infrastructure than the problem needs.
export const rateLimits = pgTable(
  'rate_limits',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bucket: text('bucket').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.bucket] })],
);
