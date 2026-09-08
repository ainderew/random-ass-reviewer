import type { GenerationStatus } from '@/domain/types';
import { db } from '@/server/db';
import {
  countChunksWithCards,
  listCardsBySource,
} from '@/server/repositories/card';
import { listChunksBySource } from '@/server/repositories/note';

// In-memory progress keyed by source id. Losing it is cosmetic: the database
// fallback below is authoritative for what actually got generated.
const progress = new Map<string, GenerationStatus>();

export function startProgress(sourceId: string, totalChunks: number): void {
  progress.set(sourceId, {
    sourceId,
    totalChunks,
    processedChunks: 0,
    failedChunks: 0,
    cardsCreated: 0,
    rejectedCards: 0,
    finished: totalChunks === 0,
    message: null,
  });
}

export function advanceProgress(
  sourceId: string,
  delta: { failed?: boolean; cards?: number; rejected?: number },
): void {
  const current = progress.get(sourceId);
  if (!current) return;
  current.processedChunks += 1;
  if (delta.failed) current.failedChunks += 1;
  current.cardsCreated += delta.cards ?? 0;
  current.rejectedCards += delta.rejected ?? 0;
}

export function finishProgress(
  sourceId: string,
  message: string | null = null,
): void {
  const current = progress.get(sourceId);
  if (!current) return;
  current.finished = true;
  current.message = message;
  // Keep it around briefly for late pollers, then let the DB answer.
  setTimeout(() => progress.delete(sourceId), 5 * 60_000).unref?.();
}

export async function getProgress(
  userId: string,
  sourceId: string,
): Promise<GenerationStatus> {
  const live = progress.get(sourceId);
  if (live) return { ...live };
  const [chunks, cards, chunksWithCards] = await Promise.all([
    listChunksBySource(db, sourceId, { limit: 500 }),
    listCardsBySource(db, { userId, sourceId }, { limit: 500 }),
    countChunksWithCards(db, sourceId),
  ]);
  return {
    sourceId,
    totalChunks: chunks.length,
    processedChunks: chunks.length,
    failedChunks: 0,
    cardsCreated: cards.length,
    rejectedCards: 0,
    finished: true,
    message:
      chunksWithCards === 0 && chunks.length > 0
        ? 'No cards were kept from these notes.'
        : null,
  };
}
