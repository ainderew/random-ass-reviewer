import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Cache, CacheContents, Rarity } from '@/domain/types';
import type { DbOrTx } from '@/server/db';
import { caches } from '@/server/db/schema';

type CacheRow = typeof caches.$inferSelect;

function toCache(row: CacheRow): Cache {
  return {
    id: row.id,
    userId: row.userId,
    sessionId: row.sessionId,
    rarity: row.rarity,
    contents: row.contents,
    openedAt: row.openedAt,
  };
}

export async function insertCache(
  tx: DbOrTx,
  input: {
    userId: string;
    sessionId: string;
    rarity: Rarity;
    contents: CacheContents;
  },
): Promise<Cache> {
  const [row] = await tx.insert(caches).values(input).returning();
  if (!row) throw new Error('insertCache returned no row');
  return toCache(row);
}

export async function findCacheById(
  tx: DbOrTx,
  input: { cacheId: string; userId: string },
): Promise<Cache | null> {
  const row = await tx.query.caches.findFirst({
    where: and(eq(caches.id, input.cacheId), eq(caches.userId, input.userId)),
  });
  return row ? toCache(row) : null;
}

// Flips opened_at exactly once. A second caller gets null and reads instead.
export async function claimCacheOpen(
  tx: DbOrTx,
  input: { cacheId: string; userId: string; openedAt: Date },
): Promise<Cache | null> {
  const [row] = await tx
    .update(caches)
    .set({ openedAt: input.openedAt })
    .where(
      and(
        eq(caches.id, input.cacheId),
        eq(caches.userId, input.userId),
        isNull(caches.openedAt),
      ),
    )
    .returning();
  return row ? toCache(row) : null;
}

// Every asset id ever won from an opened cache, with repeats.
export async function listWonAssetIds(
  tx: DbOrTx,
  userId: string,
): Promise<string[]> {
  const rows = await tx
    .select({ contents: caches.contents })
    .from(caches)
    .where(and(eq(caches.userId, userId), isNotNull(caches.openedAt)))
    .limit(2000);
  return rows.flatMap((row) => row.contents.assetIds);
}
