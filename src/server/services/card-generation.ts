import { cardBatchSchema } from '@/domain/study/card-schema';
import { quoteAppearsInSource } from '@/domain/study/verify-quote';
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
import { listChunksBySource } from '@/server/repositories/note';
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
}

// One chunk, isolated. A failure here never aborts the others.
async function generateForChunk(input: {
  userId: string;
  chunk: NoteChunk;
  provider: LlmProvider;
}): Promise<{ created: number; rejected: number }> {
  const { userId, chunk, provider } = input;
  // The quota bounds platform-key spend. BYOK bills the user; local-cli bills the developer.
  if (provider.name === 'anthropic-api') await assertWithinQuota(userId);

  const { data, usage } = await provider.generateStructured({
    system: CARD_GENERATION_SYSTEM,
    userText: cardGenerationUserText(chunk.text),
    schema: cardBatchSchema,
    model: MODELS.cardGeneration,
    maxTokens: CARD_MAX_TOKENS,
  });
  // CLI usage includes Claude Code's own system prompt; it would swamp the meter.
  if (provider.name !== 'local-cli')
    await recordUsage(userId, usage, MODELS.cardGeneration);
  if (process.env.NODE_ENV === 'development') {
    console.info(
      `[cards] chunk ${chunk.ordinal}: cache read ${usage.cacheReadInputTokens}, cache write ${usage.cacheCreationInputTokens}`,
    );
  }

  // The hallucination guard. A quote not in the source means an invented card.
  const kept = data.cards.filter((card) =>
    quoteAppearsInSource(card.sourceQuote, chunk.text),
  );
  const rejected = data.cards.length - kept.length;
  if (rejected > 0)
    console.warn(
      `[cards] chunk ${chunk.id}: dropped ${rejected} card(s) failing the quote check`,
    );

  const now = new Date();
  await insertCards(
    db,
    kept.map((card) => ({
      userId,
      chunkId: chunk.id,
      question: card.question,
      answer: card.answer,
      sourceQuote: card.sourceQuote,
      tags: [...new Set([...card.tags, card.difficulty])],
      nextDueAt: now,
      fsrsState: initialCardState(now.getTime()),
    })),
  );
  return { created: kept.length, rejected };
}

export async function generateCardsForSource(input: {
  userId: string;
  sourceId: string;
  provider: LlmProvider;
  // Retry path: skip chunks that already produced cards.
  onlyEmptyChunks?: boolean;
}): Promise<GenerationSummary> {
  let chunks = await listChunksBySource(db, input.sourceId, { limit: 500 });
  if (input.onlyEmptyChunks) {
    const done = new Set(await listChunkIdsWithCards(db, input.sourceId));
    chunks = chunks.filter((chunk) => !done.has(chunk.id));
  }
  startProgress(input.sourceId, chunks.length);
  const summary: GenerationSummary = {
    totalChunks: chunks.length,
    processedChunks: 0,
    failedChunks: 0,
    cardsCreated: 0,
    rejectedCards: 0,
  };
  let stopReason: string | null = null;

  for (const chunk of chunks) {
    if (stopReason) break;
    try {
      const result = await generateForChunk({
        userId: input.userId,
        chunk,
        provider: input.provider,
      });
      summary.cardsCreated += result.created;
      summary.rejectedCards += result.rejected;
      advanceProgress(input.sourceId, {
        cards: result.created,
        rejected: result.rejected,
      });
    } catch (error) {
      summary.failedChunks += 1;
      advanceProgress(input.sourceId, { failed: true });
      console.error(`[cards] chunk ${chunk.id} failed`, error);
      // Quota or a bad key will fail every remaining chunk the same way.
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
