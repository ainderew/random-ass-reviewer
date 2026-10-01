import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { DEFAULT_PET_NAME, PET_COATS } from '@/domain/pet/care';
import { HAPPY_START } from '@/domain/pet/happiness';
import { users } from './auth';

export const petCoat = pgEnum('pet_coat', PET_COATS);

// The study cat. One per user, made on first sight. What she has earned is
// derived from the user's real work; these columns only count what has been
// used and when she was last looked after.
export const pets = pgTable(
  'pets',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull().default(DEFAULT_PET_NAME),
    coat: petCoat('coat').notNull().default('ginger'),
    // Server-written only.
    bowlsFed: integer('bowls_fed').notNull().default(0),
    // Server-written only.
    treatsGiven: integer('treats_given').notNull().default(0),
    // Server-written only. Read through the decay in domain/pet/happiness.
    happiness: real('happiness').notNull().default(HAPPY_START),
    // When happiness was last written: the last time you were together.
    happinessAt: timestamp('happiness_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    brushedAt: timestamp('brushed_at', { withTimezone: true }),
    playedAt: timestamp('played_at', { withTimezone: true }),
    nudgedAt: timestamp('nudged_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('pets_happiness_range', sql`${t.happiness} BETWEEN 0 AND 100`),
    check('pets_bowls_fed_nonnegative', sql`${t.bowlsFed} >= 0`),
    check('pets_treats_given_nonnegative', sql`${t.treatsGiven} >= 0`),
  ],
);

// A device that agreed to the cat's nudges. The endpoint is the browser's
// own address for this subscription, so it is unique across everyone.
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('push_subscriptions_user').on(t.userId)],
);
