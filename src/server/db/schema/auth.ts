import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

// Auth.js standard tables plus the Aloft additions on `users`.
// Column keys match what @auth/drizzle-adapter expects; DB column names are snake_case.

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', {
    mode: 'date',
    withTimezone: true,
  }),
  image: text('image'),
  // Drives the in-game day/night cycle (Phase 4).
  timezone: text('timezone').notNull().default('UTC'),
  // AES-256-GCM, base64. The plaintext never leaves the server. Null = no BYOK.
  encryptedAnthropicKey: text('encrypted_anthropic_key'),
  // scrypt hash for email-and-password sign-in. Null for Google-only accounts.
  passwordHash: text('password_hash'),
  // Phase 8 preferences. Null means the product default.
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  // User-lowered daily creditable cap. Never above DAILY_CREDITABLE_MS.
  dailyCapMs: integer('daily_cap_ms'),
  breakReminderMs: integer('break_reminder_ms'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

// Named `authSessions` so nobody confuses it with `focusSessions`.
export const authSessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date', withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);
