import { and, eq, sql } from 'drizzle-orm';
import type { DbOrTx } from '@/server/db';
import {
  cards,
  focusSessions,
  mistakeChecks,
  noteChunks,
  sessionQuizQuestions as questions,
} from '@/server/db/schema';

// A wrong answer becomes a delayed check after 24 hours. The most recent
// quiz attempt supersedes earlier ones; changed or unapproved cards disappear.
export async function listMistakeChecks(
  tx: DbOrTx,
  userId: string,
  question?: { sessionId: string; cardId: string },
) {
  const lastCorrect = sql<boolean>`(select m.correct from mistake_checks m where m.session_id = ${questions.sessionId} and m.card_id = ${questions.cardId} order by m.answered_at desc limit 1)`;
  const dueAt = sql<Date>`coalesce((select max(m.answered_at) from mistake_checks m where m.session_id = ${questions.sessionId} and m.card_id = ${questions.cardId}), ${questions.answeredAt}) + interval '24 hours'`;
  return tx
    .select({
      sessionId: questions.sessionId,
      cardId: cards.id,
      sourceId: noteChunks.sourceId,
      snapshot: questions.snapshot,
      dueAt,
    })
    .from(questions)
    .innerJoin(focusSessions, eq(focusSessions.id, questions.sessionId))
    .innerJoin(cards, eq(cards.id, questions.cardId))
    .innerJoin(noteChunks, eq(noteChunks.id, cards.chunkId))
    .where(
      and(
        eq(focusSessions.userId, userId),
        eq(cards.userId, userId),
        eq(cards.reviewStatus, 'approved'),
        eq(cards.suspended, false),
        eq(questions.correct, false),
        sql`${cards.question} = ${questions.snapshot}->>'question'`,
        sql`${cards.answer} = ${questions.snapshot}->>'correctAnswer'`,
        sql`coalesce(${lastCorrect}, false) = false`,
        sql`not exists (select 1 from session_quiz_questions newer join focus_sessions fs on fs.id = newer.session_id where fs.user_id = ${userId} and newer.card_id = ${cards.id} and newer.answered_at > ${questions.answeredAt})`,
        question
          ? and(
              eq(questions.sessionId, question.sessionId),
              eq(cards.id, question.cardId),
            )
          : undefined,
      ),
    )
    .orderBy(dueAt)
    .limit(100);
}
export async function findMistakeAttempt(
  tx: DbOrTx,
  id: string,
  userId: string,
) {
  const [row] = await tx
    .select({ attempt: mistakeChecks, snapshot: questions.snapshot })
    .from(mistakeChecks)
    .innerJoin(focusSessions, eq(focusSessions.id, mistakeChecks.sessionId))
    .innerJoin(
      questions,
      and(
        eq(questions.sessionId, mistakeChecks.sessionId),
        eq(questions.cardId, mistakeChecks.cardId),
      ),
    )
    .where(and(eq(mistakeChecks.id, id), eq(focusSessions.userId, userId)));
  return row;
}
export async function insertMistakeAttempt(
  tx: DbOrTx,
  input: typeof mistakeChecks.$inferInsert,
) {
  const [row] = await tx.insert(mistakeChecks).values(input).returning();
  return row!;
}
export async function exportMistakeChecks(tx: DbOrTx, userId: string) {
  return tx
    .select({ attempt: mistakeChecks })
    .from(mistakeChecks)
    .innerJoin(focusSessions, eq(focusSessions.id, mistakeChecks.sessionId))
    .where(eq(focusSessions.userId, userId));
}
