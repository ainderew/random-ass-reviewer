import { validQuizContent } from '@/domain/study/quiz-content';
import { cardBatchSchema } from '@/domain/study/card-schema';
import {
  passageContexts,
  type PassageContext,
} from '@/domain/study/passage-context';
import { withoutSourceReference } from '@/domain/study/source-reference';
import { verifiedCards } from '@/domain/study/verified-cards';
import { env } from '@/lib/env';
import { initialCardState } from '@/domain/review/scheduler';
import type { NoteChunk } from '@/domain/types';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import { CARD_MAX_TOKENS, MODELS } from '@/server/llm/models';
import {
  CARD_GENERATION_SYSTEM,
  cardGenerationUserText,
} from '@/server/llm/prompts/card-generation';
import type { LlmProvider } from '@/server/llm/provider';
import { insertCards, listChunkIdsWithCards } from '@/server/repositories/card';
import {
  findNoteSourceById,
  listChunksBySource,
} from '@/server/repositories/note';
import {
  advanceProgress,
  finishProgress,
  startProgress,
} from './generation-progress';
import { assertWithinQuota, recordUsage } from './llm-usage';

export interface GenerationSummary {
  totalChunks: number;
  processedChunks: number;
  failedChunks: number;
  cardsCreated: number;
  rejectedCards: number;
  unansweredQuestions: number;
}

// One chunk, isolated. A failure here never aborts the others.
async function generateForChunk(input: {
  userId: string;
  title: string;
  chunk: NoteChunk;
  context: PassageContext;
  provider: LlmProvider;
}): Promise<{ created: number; rejected: number; unanswered: number }> {
  const { userId, title, chunk, context, provider } = input;
  // The quota bounds platform-key spend. BYOK bills the user; local-cli bills the developer.
  if (provider.name === 'anthropic-api') await assertWithinQuota(userId);

  const { data, usage } = await provider.generateStructured({
    system: CARD_GENERATION_SYSTEM,
    userText: cardGenerationUserText({ title, context, passage: chunk.text }),
    schema: cardBatchSchema,
    model: MODELS.cardGeneration,
    maxTokens: CARD_MAX_TOKENS,
  });
  // CLI and subscription usage include Claude Code's own system prompt and are
  // not billed per token; metering them would only swamp the numbers.
  if (provider.name !== 'local-cli')
    await recordUsage(userId, usage, MODELS.cardGeneration);
  if (env.NODE_ENV === 'development') {
    console.info(
      `[cards] chunk ${chunk.ordinal}: cache read ${usage.cacheReadInputTokens}, cache write ${usage.cacheCreationInputTokens}`,
    );
  }

  // The hallucination guard. A quote not in the source means an invented card.
  const kept = verifiedCards(data.cards, chunk.text, context.keyLetters);
  const rejected = data.cards.length - kept.length;
  if (rejected > 0)
    console.warn(
      `[cards] chunk ${chunk.id}: dropped ${rejected} card(s) failing the card checks`,
    );

  const now = new Date();
  await insertCards(
    db,
    kept.map((card) => ({
      userId,
      chunkId: chunk.id,
      question: withoutSourceReference(card.question),
      answer: withoutSourceReference(card.answer),
      sourceQuote: card.sourceQuote,
      reviewStatus: 'draft',
      subject: card.subject,
      topic: card.topic,
      quiz:
        card.quiz && validQuizContent(card.answer, card.quiz)
          ? card.quiz
          : null,
      tags: [...new Set([...card.tags, card.difficulty, card.questionType])],
      nextDueAt: now,
      fsrsState: initialCardState(now.getTime()),
    })),
  );
  return {
    created: kept.length,
    rejected,
    unanswered: Math.max(0, data.unanswered),
  };
}

type GenerationInput = {
  userId: string;
  sourceId: string;
  provider: LlmProvider;
  // Retry path: skip chunks that already produced cards.
  onlyEmptyChunks?: boolean;
};

export async function generateCardsForSource(
  input: GenerationInput,
): Promise<GenerationSummary> {
  try {
    return await generateChunks(input);
  } catch (error) {
    // Chunk failures are caught per chunk. This is everything around them; a
    // queued run that never finishes would leave the page polling forever.
    finishProgress(input.sourceId, 'Card generation stopped. Try again.');
    throw error;
  }
}

async function generateChunks(
  input: GenerationInput,
): Promise<GenerationSummary> {
  const source = await findNoteSourceById(db, {
    userId: input.userId,
    sourceId: input.sourceId,
  });
  if (!source) throw new AppError('NOT_FOUND', 'Those notes are gone.');
  // Context comes from every chunk, even on a retry that skips some: the
  // answer key usually sits in a chunk that already finished.
  const allChunks = await listChunksBySource(db, input.sourceId, {
    limit: 500,
  });
  const contexts = passageContexts(allChunks);
  const done = new Set(
    input.onlyEmptyChunks
      ? await listChunkIdsWithCards(db, input.sourceId)
      : [],
  );
  const chunks = allChunks.filter((chunk) => !done.has(chunk.id));
  startProgress(input.sourceId, chunks.length);
  const summary: GenerationSummary = {
    totalChunks: chunks.length,
    processedChunks: 0,
    failedChunks: 0,
    cardsCreated: 0,
    rejectedCards: 0,
    unansweredQuestions: 0,
  };
  let stopReason: string | null = null;

  for (const chunk of chunks) {
    if (stopReason) break;
    try {
      const result = await generateForChunk({
        userId: input.userId,
        title: source.title,
        chunk,
        context: contexts[allChunks.indexOf(chunk)]!,
        provider: input.provider,
      });
      summary.cardsCreated += result.created;
      summary.rejectedCards += result.rejected;
      summary.unansweredQuestions += result.unanswered;
      advanceProgress(input.sourceId, {
        cards: result.created,
        rejected: result.rejected,
        unanswered: result.unanswered,
      });
    } catch (error) {
      summary.failedChunks += 1;
      advanceProgress(input.sourceId, { failed: true });
      console.error(`[cards] chunk ${chunk.id} failed`, error);
      // Quota or a bad key will fail every remaining chunk the same way. A
      // response that fails the schema is this chunk's problem (INVALID_STATE).
      if (
        error instanceof AppError &&
        (error.code === 'RATE_LIMITED' || error.code === 'VALIDATION')
      ) {
        stopReason = error.message;
      }
    }
    summary.processedChunks += 1;
  }

  finishProgress(input.sourceId, stopReason);
  return summary;
}
