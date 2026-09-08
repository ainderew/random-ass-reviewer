import { isAssetId } from '@/domain/assets/manifest.generated';
import { starterAssetIds } from '@/domain/economy/unlocks';
import type { DbOrTx } from '@/server/db';
import { listWonAssetIds } from '@/server/repositories/cache';
import { countPlacementsByAsset } from '@/server/repositories/island';

export interface Ownership {
  ownedAssetIds: string[];
  // Won copies minus placed copies, per asset. Placing one of these is free.
  freeCredits: Record<string, number>;
}

// No inventory table. Ownership is starters plus opened caches, and free
// placements are whatever was won and not yet put down.
export async function getOwnership(
  tx: DbOrTx,
  userId: string,
  islandId: string,
): Promise<Ownership> {
  const [won, placed] = await Promise.all([
    listWonAssetIds(tx, userId),
    countPlacementsByAsset(tx, islandId),
  ]);
  const wonCounts = new Map<string, number>();
  for (const id of won) {
    if (isAssetId(id)) wonCounts.set(id, (wonCounts.get(id) ?? 0) + 1);
  }
  const freeCredits: Record<string, number> = {};
  for (const [id, count] of wonCounts) {
    const remaining = count - (placed.get(id) ?? 0);
    if (remaining > 0) freeCredits[id] = remaining;
  }
  const ownedAssetIds = [
    ...new Set<string>([...starterAssetIds(), ...wonCounts.keys()]),
  ];
  return { ownedAssetIds, freeCredits };
}
