import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { NOTE_KINDS, type FsrsState } from '@/domain/types/study';
import { users } from './auth';
import { focusSessions } from './sessions';

export const noteKind = pgEnum('note_kind', NOTE_KINDS);

export const noteSources = pgTable(
  'note_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: noteKind('kind').notNull(),
    title: text('title').notNull(),
    // sha256 of normalised content.
    contentHash: text('content_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Never pay twice to process identical notes.
  (t) => [uniqueIndex('note_sources_user_hash').on(t.userId, t.contentHash)],
);

export const noteChunks = pgTable(
  'note_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => noteSources.id, { onDelete: 'cascade' }),
    ordinal: integer('ordinal').notNull(),
    text: text('text').notNull(),
    tokenCount: integer('token_count').notNull(),
  },
  (t) => [index('note_chunks_source_ordinal_idx').on(t.sourceId, t.ordinal)],
);

export const cards = pgTable(
  'cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => noteChunks.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    // Must appear verbatim in the parent chunk. Hallucination guard.
    sourceQuote: text('source_quote').notNull(),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    nextDueAt: timestamp('next_due_at', { withTimezone: true }).notNull(),
    fsrsState: jsonb('fsrs_state').$type<FsrsState>().notNull(),
    suspended: boolean('suspended').notNull().default(false),
  },
  // The review queue query.
  (t) => [index('cards_user_due_idx').on(t.userId, t.nextDueAt)],
);

export const cardReviews = pgTable(
  'card_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    // Links recall to a focus session when one was running.
    sessionId: uuid('session_id').references(() => focusSessions.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // FSRS 1-4: Again / Hard / Good / Easy.
    rating: smallint('rating').notNull(),
    elapsedMs: integer('elapsed_ms').notNull(),
  },
  (t) => [
    index('card_reviews_card_reviewed_idx').on(t.cardId, t.reviewedAt.desc()),
  ],
);
