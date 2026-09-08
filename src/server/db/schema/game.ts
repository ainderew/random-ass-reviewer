import {
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { RARITIES, type CacheContents } from '@/domain/types/cache';
import { users } from './auth';
import { focusSessions } from './sessions';

export const userStats = pgTable('user_stats', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Server-written only.
  focusBalance: integer('focus_balance').notNull().default(0),
  // Server-written only.
  insightBalance: integer('insight_balance').notNull().default(0),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  streakDays: integer('streak_days').notNull().default(0),
  streakFreezes: integer('streak_freezes').notNull().default(2),
  // For streak computation in the user's timezone.
  lastSessionDate: date('last_session_date'),
  // Caches opened since the last rare drop.
  pityCounter: integer('pity_counter').notNull().default(0),
});

export const islands = pgTable('islands', {
  id: uuid('id').primaryKey().defaultRandom(),
  // One island per user for now.
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme').notNull().default('meadow'),
  tileCount: integer('tile_count').notNull().default(9),
});

export const placements = pgTable(
  'placements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    islandId: uuid('island_id')
      .notNull()
      .references(() => islands.id, { onDelete: 'cascade' }),
    // Must exist in the generated asset manifest (Phase 3).
    assetId: text('asset_id').notNull(),
    x: integer('x').notNull(),
    z: integer('z').notNull(),
    // Quarter turns, 0-3.
    rotY: integer('rot_y').notNull().default(0),
    placedAt: timestamp('placed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // One object per tile, enforced by the database rather than a check-then-insert.
  (t) => [uniqueIndex('placements_one_per_tile').on(t.islandId, t.x, t.z)],
);

export const rarity = pgEnum('rarity', RARITIES);

export const caches = pgTable('caches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // One cache per session.
  sessionId: uuid('session_id')
    .notNull()
    .unique()
    .references(() => focusSessions.id, { onDelete: 'cascade' }),
  rarity: rarity('rarity').notNull(),
  contents: jsonb('contents').$type<CacheContents>().notNull(),
  // Null means unopened.
  openedAt: timestamp('opened_at', { withTimezone: true }),
});
