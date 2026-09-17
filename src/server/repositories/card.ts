import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  isNull,
  lte,
  sql,
} from 'drizzle-orm';
import type {
  Card,
  CardReview,
  FsrsState,
  Rating,
  UpdateCardRequest,
} from '@/domain/types';
import type { DbOrTx } from '@/server/db';
import { cardReviews, cards, noteChunks } from '@/server/db/schema';
import { clampPage, type Page } from './pagination';

type CardRow = typeof cards.$inferSelect;
type ReviewRow = typeof cardReviews.$inferSelect;

function toCard(row: CardRow): Card {
  return {
    id: row.id,
    userId: row.userId,
    chunkId: row.chunkId,
    question: row.question,
    answer: row.answer,
    sourceQuote: row.sourceQuote,
    tags: row.tags,
    nextDueAt: row.nextDueAt,
    fsrsState: row.fsrsState,
    suspended: row.suspended,
    reviewStatus: row.reviewStatus,
    subject: row.subject,
    topic: row.topic,
    quiz: row.quiz,
  };
}

function toCardReview(row: ReviewRow): CardReview {
  return {
    id: row.id,
    cardId: row.cardId,
    sessionId: row.sessionId,
    reviewedAt: row.reviewedAt,
    rating: row.rating as Rating,
    elapsedMs: row.elapsedMs,
  };
}

export interface NewCard {
  reviewStatus?: Card['reviewStatus'];
  subject?: Card['subject'];
  topic?: Card['topic'];
  quiz?: Card['quiz'];
  userId: string;
  chunkId: string;
  question: string;
  answer: string;
  sourceQuote: string;
  tags: string[];
  nextDueAt: Date;
  fsrsState: FsrsState;
}

export async function insertCards(
  tx: DbOrTx,
  input: NewCard[],
): Promise<Card[]> {
  if (input.length === 0) return [];
  const rows = await tx.insert(cards).values(input).returning();
  return rows.map(toCard);
}

export async function findCardById(
  tx: DbOrTx,
  id: string,
): Promise<Card | null> {
  const row = await tx.query.cards.findFirst({ where: eq(cards.id, id) });
  return row ? toCard(row) : null;
}

// Cards due at or before `now`, FSRS-ordered by due time. Uses cards_user_due_idx.
export async function listDueCards(
  tx: DbOrTx,
  input: { userId: string; now: Date },
  page?: Partial<Page>,
): Promise<Card[]> {
  const { limit, offset } = clampPage(page);
  const rows = await tx
    .select()
    .from(cards)
    .where(
      and(
        eq(cards.userId, input.userId),
        eq(cards.suspended, false),
        eq(cards.reviewStatus, 'approved'),
        lte(cards.nextDueAt, input.now),
      ),
    )
    .orderBy(asc(cards.nextDueAt))
    .limit(limit)
    .offset(offset);
  return rows.map(toCard);
}

export async function updateCardSchedule(
  tx: DbOrTx,
  id: string,
  patch: { nextDueAt: Date; fsrsState: FsrsState },
): Promise<Card | null> {
  const [row] = await tx
    .update(cards)
    .set(patch)
    .where(eq(cards.id, id))
    .returning();
  return row ? toCard(row) : null;
}

export async function insertCardReview(
  tx: DbOrTx,
  input: {
    cardId: string;
    sessionId: string | null;
    rating: Rating;
    elapsedMs: number;
  },
): Promise<CardReview> {
  const [row] = await tx.insert(cardReviews).values(input).returning();
  if (!row) throw new Error('insertCardReview returned no row');
  return toCardReview(row);
}

export async function listCardsBySource(
  tx: DbOrTx,
  input: { userId: string; sourceId: string },
  page?: Partial<Page>,
): Promise<Card[]> {
  const { limit, offset } = clampPage(page);
  const rows = await tx
    .select({ card: cards })
    .from(cards)
    .innerJoin(noteChunks, eq(noteChunks.id, cards.chunkId))
    .where(
      and(
        eq(cards.userId, input.userId),
        eq(noteChunks.sourceId, input.sourceId),
      ),
    )
    .orderBy(asc(noteChunks.ordinal), asc(cards.id))
    .limit(limit)
    .offset(offset);
  return rows.map((r) => toCard(r.card));
}

export async function countCardsBySource(
  tx: DbOrTx,
  userId: string,
): Promise<Map<string, number>> {
  const rows = await tx
    .select({ sourceId: noteChunks.sourceId, value: count() })
    .from(cards)
    .innerJoin(noteChunks, eq(noteChunks.id, cards.chunkId))
    .where(eq(cards.userId, userId))
    .groupBy(noteChunks.sourceId);
  return new Map(rows.map((r) => [r.sourceId, r.value]));
}

export async function countChunksWithCards(
  tx: DbOrTx,
  sourceId: string,
): Promise<number> {
  const rows = await tx
    .select({ chunkId: cards.chunkId })
    .from(cards)
    .innerJoin(noteChunks, eq(noteChunks.id, cards.chunkId))
    .where(eq(noteChunks.sourceId, sourceId))
    .groupBy(cards.chunkId);
  return rows.length;
}

export async function updateCardText(
  tx: DbOrTx,
  input: UpdateCardRequest & { userId: string; cardId: string },
): Promise<Card | null> {
  const [row] = await tx
    .update(cards)
    .set(
      Object.fromEntries(
        Object.entries(input).filter(
          ([key, value]) =>
            key !== 'userId' && key !== 'cardId' && value !== undefined,
        ),
      ),
    )
    .where(and(eq(cards.id, input.cardId), eq(cards.userId, input.userId)))
    .returning();
  return row ? toCard(row) : null;
}

export async function deleteCard(
  tx: DbOrTx,
  input: { userId: string; cardId: string },
): Promise<boolean> {
  const rows = await tx
    .delete(cards)
    .where(and(eq(cards.id, input.cardId), eq(cards.userId, input.userId)))
    .returning({ id: cards.id });
  return rows.length > 0;
}

export async function listChunkIdsWithCards(
  tx: DbOrTx,
  sourceId: string,
): Promise<string[]> {
  const rows = await tx
    .select({ chunkId: cards.chunkId })
    .from(cards)
    .innerJoin(noteChunks, eq(noteChunks.id, cards.chunkId))
    .where(eq(noteChunks.sourceId, sourceId))
    .groupBy(cards.chunkId);
  return rows.map((r) => r.chunkId);
}

// Cards reviewed at least once. Quiz candidates; recognition of things the
// user has actually recalled before.
export async function listSeenCards(
  tx: DbOrTx,
  userId: string,
  page?: Partial<Page>,
): Promise<Card[]> {
  const { limit, offset } = clampPage(page);
  const rows = await tx
    .select()
    .from(cards)
    .where(
      and(
        eq(cards.userId, userId),
        eq(cards.suspended, false),
        eq(cards.reviewStatus, 'approved'),
        sql`coalesce((${cards.fsrsState}->>'state')::int, 0) <> 0`,
      ),
    )
    .orderBy(asc(cards.id))
    .limit(limit)
    .offset(offset);
  return rows.map(toCard);
}

// Cards whose first review happened at or after `since`.
export async function countCardsFirstReviewedSince(
  tx: DbOrTx,
  input: { userId: string; since: Date },
): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(cards)
    .where(
      and(
        eq(cards.userId, input.userId),
        sql`(select min(${cardReviews.reviewedAt}) from ${cardReviews} where ${cardReviews.cardId} = ${cards.id}) >= ${input.since}`,
      ),
    );
  return row?.value ?? 0;
}

// Most recent first. Used for the consecutive-correct run and retention.
export async function listRecentReviews(
  tx: DbOrTx,
  input: { userId: string; since?: Date; includeQuiz?: boolean },
  page?: Partial<Page>,
): Promise<CardReview[]> {
  const { limit, offset } = clampPage(page);
  const rows = await tx
    .select({ review: cardReviews })
    .from(cardReviews)
    .innerJoin(cards, eq(cards.id, cardReviews.cardId))
    .where(
      and(
        eq(cards.userId, input.userId),
        input.includeQuiz ? undefined : isNull(cardReviews.sessionId),
        input.since ? gte(cardReviews.reviewedAt, input.since) : undefined,
      ),
    )
    .orderBy(desc(cardReviews.reviewedAt))
    .limit(limit)
    .offset(offset);
  return rows.map((r) => toCardReview(r.review));
}

export async function listCardsDueBetween(
  tx: DbOrTx,
  input: { userId: string; from: Date; to: Date },
  page?: Partial<Page>,
): Promise<Card[]> {
  const { limit, offset } = clampPage(page);
  const rows = await tx
    .select()
    .from(cards)
    .where(
      and(
        eq(cards.userId, input.userId),
        eq(cards.suspended, false),
        eq(cards.reviewStatus, 'approved'),
        gt(cards.nextDueAt, input.from),
        lte(cards.nextDueAt, input.to),
      ),
    )
    .orderBy(asc(cards.nextDueAt))
    .limit(limit)
    .offset(offset);
  return rows.map(toCard);
}

export async function countCardsByMaturity(
  tx: DbOrTx,
  userId: string,
  matureDays: number,
): Promise<{ total: number; new: number; learning: number; mature: number }> {
  const [row] = await tx
    .select({
      total: count(),
      fresh: sql<number>`count(*) filter (where coalesce((${cards.fsrsState}->>'state')::int, 0) = 0)`,
      mature: sql<number>`count(*) filter (where coalesce((${cards.fsrsState}->>'state')::int, 0) <> 0 and (${cards.fsrsState}->>'scheduled_days')::numeric >= ${matureDays})`,
    })
    .from(cards)
    .where(
      and(
        eq(cards.userId, userId),
        eq(cards.reviewStatus, 'approved'),
        eq(cards.suspended, false),
      ),
    );
  const total = row?.total ?? 0;
  const fresh = Number(row?.fresh ?? 0);
  const mature = Number(row?.mature ?? 0);
  return { total, new: fresh, learning: total - fresh - mature, mature };
}

// Reviews recorded against one focus session, oldest first. Only the quiz
// writes these; a normal review never carries a session id.
export async function listReviewsForSession(
  tx: DbOrTx,
  sessionId: string,
): Promise<CardReview[]> {
  const rows = await tx
    .select()
    .from(cardReviews)
    .where(eq(cardReviews.sessionId, sessionId))
    .orderBy(asc(cardReviews.reviewedAt))
    .limit(100);
  return rows.map(toCardReview);
}

// Every unsuspended card the user owns. The quiz's distractor pool.
export async function listUserCards(
  tx: DbOrTx,
  userId: string,
  page?: Partial<Page>,
): Promise<Card[]> {
  const { limit, offset } = clampPage(page);
  const rows = await tx
    .select()
    .from(cards)
    .where(
      and(
        eq(cards.userId, userId),
        eq(cards.suspended, false),
        eq(cards.reviewStatus, 'approved'),
      ),
    )
    .orderBy(asc(cards.id))
    .limit(limit)
    .offset(offset);
  return rows.map(toCard);
}

export async function findNextDueAt(
  tx: DbOrTx,
  input: { userId: string; after: Date },
): Promise<Date | null> {
  const row = await tx.query.cards.findFirst({
    where: and(
      eq(cards.userId, input.userId),
      eq(cards.suspended, false),
      eq(cards.reviewStatus, 'approved'),
      gt(cards.nextDueAt, input.after),
    ),
    orderBy: asc(cards.nextDueAt),
    columns: { nextDueAt: true },
  });
  return row?.nextDueAt ?? null;
}

// Reviews rated Good or Easy, lifetime. Cards remembered, for the shelves.
export async function countRecalled(
  tx: DbOrTx,
  userId: string,
): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(cardReviews)
    .innerJoin(cards, eq(cards.id, cardReviews.cardId))
    .where(and(eq(cards.userId, userId), gte(cardReviews.rating, 3)));
  return row?.value ?? 0;
}

// Serializes reviews and edits of one card.
export async function lockCard(
  tx: DbOrTx,
  userId: string,
  cardId: string,
): Promise<Card | null> {
  const [row] = await tx
    .select()
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .for('update');
  return row ? toCard(row) : null;
}

export async function hasRecallSince(
  tx: DbOrTx,
  cardId: string,
  since: Date,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: cardReviews.id })
    .from(cardReviews)
    .where(
      and(
        eq(cardReviews.cardId, cardId),
        isNull(cardReviews.sessionId),
        gte(cardReviews.reviewedAt, since),
      ),
    )
    .limit(1);
  return !!row;
}

export async function listAllUserCards(
  tx: DbOrTx,
  userId: string,
): Promise<Card[]> {
  return (await tx.select().from(cards).where(eq(cards.userId, userId))).map(
    toCard,
  );
}
