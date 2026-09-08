import { createHash } from 'node:crypto';
import { chunkText } from '@/domain/study/chunking';
import type {
  CreateNoteResponse,
  NoteDetail,
  NoteKind,
  NoteSourceSummary,
} from '@/domain/types';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import type { LlmProvider } from '@/server/llm/provider';
import {
  countCardsBySource,
  listCardsBySource,
} from '@/server/repositories/card';
import {
  countChunksBySource,
  deleteNoteSource,
  findNoteSourceByHash,
  findNoteSourceById,
  insertNoteChunks,
  insertNoteSource,
  listChunksBySource,
  listNoteSources,
} from '@/server/repositories/note';
import { generateCardsForSource } from './card-generation';
import { getProgress } from './generation-progress';

const TARGET_TOKENS = 1500;
const MAX_TOKENS = 2000;

export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// Cheap approximation for the split search; the real counter runs once per
// final chunk when the provider offers one.
const roughTokens = (s: string) => Math.ceil(s.length / 4);

// Hash, dedupe, chunk, store. One transaction for source plus chunks.
// Generation itself is the caller's job so a route can defer it.
export async function createNoteSource(input: {
  userId: string;
  kind: NoteKind;
  title: string;
  text: string;
}): Promise<CreateNoteResponse & { chunkCount: number }> {
  const hash = contentHash(input.text);
  const existing = await findNoteSourceByHash(db, {
    userId: input.userId,
    contentHash: hash,
  });
  if (existing)
    return { sourceId: existing.id, deduplicated: true, chunkCount: 0 };

  const chunks = chunkText({
    text: input.text,
    targetTokens: TARGET_TOKENS,
    maxTokens: MAX_TOKENS,
    estimateTokens: roughTokens,
  });
  if (chunks.length === 0)
    throw new AppError('VALIDATION', 'There is no text in these notes.');

  const source = await db.transaction(async (tx) => {
    const created = await insertNoteSource(tx, {
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      contentHash: hash,
    });
    await insertNoteChunks(
      tx,
      chunks.map((chunk) => ({
        sourceId: created.id,
        ordinal: chunk.ordinal,
        text: chunk.text,
        tokenCount: roughTokens(chunk.text),
      })),
    );
    return created;
  });
  return {
    sourceId: source.id,
    deduplicated: false,
    chunkCount: chunks.length,
  };
}

export async function runGeneration(input: {
  userId: string;
  sourceId: string;
  provider: LlmProvider;
}): Promise<void> {
  await generateCardsForSource(input);
}

export async function listNotes(userId: string): Promise<NoteSourceSummary[]> {
  const [sources, chunkCounts, cardCounts] = await Promise.all([
    listNoteSources(db, userId, { limit: 200 }),
    countChunksBySource(db, userId),
    countCardsBySource(db, userId),
  ]);
  return sources.map((source) => ({
    id: source.id,
    kind: source.kind,
    title: source.title,
    createdAt: source.createdAt,
    chunkCount: chunkCounts.get(source.id) ?? 0,
    cardCount: cardCounts.get(source.id) ?? 0,
  }));
}

export async function getNoteDetail(input: {
  userId: string;
  sourceId: string;
}): Promise<NoteDetail> {
  const source = await findNoteSourceById(db, input);
  if (!source) throw new AppError('NOT_FOUND', 'Notes not found');
  const [chunks, cards, status] = await Promise.all([
    listChunksBySource(db, source.id, { limit: 500 }),
    listCardsBySource(
      db,
      { userId: input.userId, sourceId: source.id },
      { limit: 500 },
    ),
    getProgress(input.userId, source.id),
  ]);
  return { source, chunks, cards, status };
}

export async function removeNote(input: {
  userId: string;
  sourceId: string;
}): Promise<void> {
  const removed = await deleteNoteSource(db, input);
  if (!removed) throw new AppError('NOT_FOUND', 'Notes not found');
}

// Sections that failed or produced nothing get another go. Nothing is
// regenerated for sections that already have cards.
export async function retryGeneration(input: {
  userId: string;
  sourceId: string;
  provider: LlmProvider;
}): Promise<void> {
  const source = await findNoteSourceById(db, input);
  if (!source) throw new AppError('NOT_FOUND', 'Notes not found');
  await generateCardsForSource({ ...input, onlyEmptyChunks: true });
}
