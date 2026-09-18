import { and, eq, gte } from 'drizzle-orm';
import type { DbOrTx } from '@/server/db';
import { cardReviews, cards } from '@/server/db/schema';
export function progressReviews(db: DbOrTx, userId: string, since: Date) {
  return db
    .select({
      cardId: cardReviews.cardId,
      reviewedAt: cardReviews.reviewedAt,
      rating: cardReviews.rating,
      practiceType: cardReviews.practiceType,
      correct: cardReviews.correct,
      delayDays: cardReviews.delayDays,
      subject: cardReviews.subject,
    })
    .from(cardReviews)
    .innerJoin(cards, eq(cards.id, cardReviews.cardId))
    .where(and(eq(cards.userId, userId), gte(cardReviews.reviewedAt, since)));
}
