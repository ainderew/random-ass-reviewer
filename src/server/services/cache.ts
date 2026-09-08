import type { CacheOpenResponse } from '@/domain/types';
import { db } from '@/server/db';
import { AppError } from '@/server/errors';
import { claimCacheOpen, findCacheById } from '@/server/repositories/cache';
import { incrementBalances } from '@/server/repositories/user-stats';

// Idempotent by opened_at. A double-click or a retry returns the same
// contents and credits nothing twice: the claim is a conditional update.
export async function openCache(input: {
  userId: string;
  cacheId: string;
}): Promise<CacheOpenResponse> {
  return db.transaction(async (tx) => {
    const existing = await findCacheById(tx, input);
    if (!existing) throw new AppError('NOT_FOUND', 'Cache not found');
    if (existing.openedAt) {
      return {
        rarity: existing.rarity,
        contents: existing.contents,
        alreadyOpened: true,
      };
    }

    const claimed = await claimCacheOpen(tx, {
      ...input,
      openedAt: new Date(),
    });
    if (!claimed) {
      // Lost the race to a parallel open. Read what it did.
      const reread = await findCacheById(tx, input);
      if (!reread) throw new AppError('NOT_FOUND', 'Cache not found');
      return {
        rarity: reread.rarity,
        contents: reread.contents,
        alreadyOpened: true,
      };
    }

    await incrementBalances(tx, input.userId, {
      focus: claimed.contents.focus,
      insight: claimed.contents.insight,
    });
    return {
      rarity: claimed.rarity,
      contents: claimed.contents,
      alreadyOpened: false,
    };
  });
}
