import { date, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { users } from './auth';
export const userStats = pgTable('user_stats', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  streakDays: integer('streak_days').notNull().default(0),
  streakFreezes: integer('streak_freezes').notNull().default(2),
  lastSessionDate: date('last_session_date'),
});
