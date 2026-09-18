import { and, eq, inArray } from 'drizzle-orm';
import type { DbOrTx } from '@/server/db';
import { noteChunks, noteSources } from '@/server/db/schema';
export async function sourcesForChunks(
  tx: DbOrTx,
  userId: string,
  chunkIds: string[],
) {
  if (!chunkIds.length) return [];
  return tx
    .select({
      chunkId: noteChunks.id,
      id: noteSources.id,
      title: noteSources.title,
    })
    .from(noteChunks)
    .innerJoin(noteSources, eq(noteSources.id, noteChunks.sourceId))
    .where(
      and(
        eq(noteSources.userId, userId),
        inArray(noteChunks.id, [...new Set(chunkIds)]),
      ),
    );
}
