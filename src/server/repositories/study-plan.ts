import { and, count, eq, sql } from 'drizzle-orm';
import type { DbOrTx } from '@/server/db';
import {
  cards,
  focusSessions,
  noteChunks,
  sessionQuizQuestions,
} from '@/server/db/schema';
import type { SubjectProgress } from '@/domain/types/study-plan';

export async function subjectProgress(
  tx: DbOrTx,
  userId: string,
): Promise<SubjectProgress[]> {
  const rows = await tx
    .select({
      subject: cards.subject,
      total: count(),
      approved: sql<number>`count(*) filter (where ${cards.reviewStatus} = 'approved' and not ${cards.suspended})`,
      practiced: sql<number>`count(*) filter (where ${cards.reviewStatus} = 'approved' and not ${cards.suspended} and coalesce((${cards.fsrsState}->>'reps')::int, 0) > 0)`,
      topics: sql<number>`count(distinct ${cards.topic}) filter (where ${cards.reviewStatus} = 'approved' and not ${cards.suspended})`,
    })
    .from(cards)
    .where(eq(cards.userId, userId))
    .groupBy(cards.subject);
  return rows.map((r) => ({
    ...r,
    total: Number(r.total),
    approved: Number(r.approved),
    practiced: Number(r.practiced),
    topics: Number(r.topics),
  }));
}

export async function recentQuizMistakes(tx: DbOrTx, userId: string) {
  // Pick only the latest answered attempt of each surviving, approved card.
  // A later correct answer removes it; a later edit makes it draft until checked.
  const rows = await tx
    .select({
      cardId: cards.id,
      sourceId: noteChunks.sourceId,
      question: cards.question,
      answer: cards.answer,
      explanation: sessionQuizQuestions.snapshot,
      sourceQuote: cards.sourceQuote,
    })
    .from(sessionQuizQuestions)
    .innerJoin(
      focusSessions,
      eq(focusSessions.id, sessionQuizQuestions.sessionId),
    )
    .innerJoin(cards, eq(cards.id, sessionQuizQuestions.cardId))
    .innerJoin(noteChunks, eq(noteChunks.id, cards.chunkId))
    .where(
      and(
        eq(focusSessions.userId, userId),
        eq(cards.userId, userId),
        eq(cards.reviewStatus, 'approved'),
        eq(cards.suspended, false),
        eq(sessionQuizQuestions.correct, false),
        sql`${cards.question} = ${sessionQuizQuestions.snapshot}->>'question'`,
        sql`${cards.answer} = ${sessionQuizQuestions.snapshot}->>'correctAnswer'`,
        sql`not exists (select 1 from session_quiz_questions newer join focus_sessions fs on fs.id = newer.session_id where fs.user_id = ${userId} and newer.card_id = ${cards.id} and newer.answered_at > ${sessionQuizQuestions.answeredAt})`,
      ),
    )
    .orderBy(sql`${sessionQuizQuestions.answeredAt} desc`)
    .limit(10);
  return rows.map((r) => ({ ...r, explanation: r.explanation.explanation }));
}
