import { and, asc, count, desc, eq } from 'drizzle-orm';
import type { NoteChunk, NoteKind, NoteSource } from '@/domain/types';
import type { DbOrTx } from '@/server/db';
import { noteChunks, noteSources } from '@/server/db/schema';
import { clampPage, type Page } from './pagination';

type SourceRow = typeof noteSources.$inferSelect;
type ChunkRow = typeof noteChunks.$inferSelect;

function toNoteSource(row: SourceRow): NoteSource {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    title: row.title,
    contentHash: row.contentHash,
    createdAt: row.createdAt,
  };
}

function toNoteChunk(row: ChunkRow): NoteChunk {
  return {
    id: row.id,
    sourceId: row.sourceId,
    ordinal: row.ordinal,
    text: row.text,
    tokenCount: row.tokenCount,
  };
}

// The unique index on (user_id, content_hash) rejects re-processing identical notes.
export async function insertNoteSource(
  tx: DbOrTx,
  input: { userId: string; kind: NoteKind; title: string; contentHash: string },
): Promise<NoteSource> {
  const [row] = await tx.insert(noteSources).values(input).returning();
  if (!row) throw new Error('insertNoteSource returned no row');
  return toNoteSource(row);
}

export async function findNoteSourceByHash(
  tx: DbOrTx,
  input: { userId: string; contentHash: string },
): Promise<NoteSource | null> {
  const row = await tx.query.noteSources.findFirst({
    where: and(
      eq(noteSources.userId, input.userId),
      eq(noteSources.contentHash, input.contentHash),
    ),
  });
  return row ? toNoteSource(row) : null;
}

export async function insertNoteChunks(
  tx: DbOrTx,
  input: {
    sourceId: string;
    ordinal: number;
    text: string;
    tokenCount: number;
  }[],
): Promise<NoteChunk[]> {
  if (input.length === 0) return [];
  const rows = await tx.insert(noteChunks).values(input).returning();
  return rows.map(toNoteChunk);
}

export async function listChunksBySource(
  tx: DbOrTx,
  sourceId: string,
  page?: Partial<Page>,
): Promise<NoteChunk[]> {
  const { limit, offset } = clampPage(page);
  const rows = await tx
    .select()
    .from(noteChunks)
    .where(eq(noteChunks.sourceId, sourceId))
    .orderBy(asc(noteChunks.ordinal))
    .limit(limit)
    .offset(offset);
  return rows.map(toNoteChunk);
}

export async function findNoteSourceById(
  tx: DbOrTx,
  input: { userId: string; sourceId: string },
): Promise<NoteSource | null> {
  const row = await tx.query.noteSources.findFirst({
    where: and(
      eq(noteSources.id, input.sourceId),
      eq(noteSources.userId, input.userId),
    ),
  });
  return row ? toNoteSource(row) : null;
}

export async function listNoteSources(
  tx: DbOrTx,
  userId: string,
  page?: Partial<Page>,
): Promise<NoteSource[]> {
  const { limit, offset } = clampPage(page);
  const rows = await tx
    .select()
    .from(noteSources)
    .where(eq(noteSources.userId, userId))
    .orderBy(desc(noteSources.createdAt))
    .limit(limit)
    .offset(offset);
  return rows.map(toNoteSource);
}

export async function deleteNoteSource(
  tx: DbOrTx,
  input: { userId: string; sourceId: string },
): Promise<boolean> {
  const rows = await tx
    .delete(noteSources)
    .where(
      and(
        eq(noteSources.id, input.sourceId),
        eq(noteSources.userId, input.userId),
      ),
    )
    .returning({ id: noteSources.id });
  return rows.length > 0;
}

export async function countChunksBySource(
  tx: DbOrTx,
  userId: string,
): Promise<Map<string, number>> {
  const rows = await tx
    .select({ sourceId: noteChunks.sourceId, value: count() })
    .from(noteChunks)
    .innerJoin(noteSources, eq(noteSources.id, noteChunks.sourceId))
    .where(eq(noteSources.userId, userId))
    .groupBy(noteChunks.sourceId);
  return new Map(rows.map((r) => [r.sourceId, r.value]));
}

export async function countNoteSources(
  tx: DbOrTx,
  userId: string,
): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(noteSources)
    .where(eq(noteSources.userId, userId));
  return row?.value ?? 0;
}
