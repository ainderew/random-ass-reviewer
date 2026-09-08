import { and, count, eq } from 'drizzle-orm';
import type { Island, Placement } from '@/domain/types';
import type { DbOrTx } from '@/server/db';
import { islands, placements } from '@/server/db/schema';
import { clampPage, type Page } from './pagination';

type IslandRow = typeof islands.$inferSelect;
type PlacementRow = typeof placements.$inferSelect;

function toIsland(row: IslandRow): Island {
  return {
    id: row.id,
    userId: row.userId,
    theme: row.theme,
    tileCount: row.tileCount,
  };
}

function toPlacement(row: PlacementRow): Placement {
  return {
    id: row.id,
    islandId: row.islandId,
    assetId: row.assetId,
    x: row.x,
    z: row.z,
    rotY: row.rotY,
    placedAt: row.placedAt,
  };
}

export async function createIsland(
  tx: DbOrTx,
  userId: string,
): Promise<Island> {
  const [row] = await tx.insert(islands).values({ userId }).returning();
  if (!row) throw new Error('createIsland returned no row');
  return toIsland(row);
}

export async function findIslandByUserId(
  tx: DbOrTx,
  userId: string,
): Promise<Island | null> {
  const row = await tx.query.islands.findFirst({
    where: eq(islands.userId, userId),
  });
  return row ? toIsland(row) : null;
}

export async function listPlacements(
  tx: DbOrTx,
  islandId: string,
  page?: Partial<Page>,
): Promise<Placement[]> {
  const { limit, offset } = clampPage(page);
  const rows = await tx
    .select()
    .from(placements)
    .where(eq(placements.islandId, islandId))
    .orderBy(placements.placedAt)
    .limit(limit)
    .offset(offset);
  return rows.map(toPlacement);
}

// The unique index on (island_id, x, z) rejects a second object on one tile.
export async function insertPlacement(
  tx: DbOrTx,
  input: {
    islandId: string;
    assetId: string;
    x: number;
    z: number;
    rotY?: number;
  },
): Promise<Placement> {
  const [row] = await tx
    .insert(placements)
    .values({ ...input, rotY: input.rotY ?? 0 })
    .returning();
  if (!row) throw new Error('insertPlacement returned no row');
  return toPlacement(row);
}

export async function deletePlacement(
  tx: DbOrTx,
  input: { islandId: string; placementId: string },
): Promise<Placement | null> {
  const [row] = await tx
    .delete(placements)
    .where(
      and(
        eq(placements.id, input.placementId),
        eq(placements.islandId, input.islandId),
      ),
    )
    .returning();
  return row ? toPlacement(row) : null;
}

export async function findPlacementById(
  tx: DbOrTx,
  input: { islandId: string; placementId: string },
): Promise<Placement | null> {
  const row = await tx.query.placements.findFirst({
    where: and(
      eq(placements.id, input.placementId),
      eq(placements.islandId, input.islandId),
    ),
  });
  return row ? toPlacement(row) : null;
}

export async function countPlacementsByAsset(
  tx: DbOrTx,
  islandId: string,
): Promise<Map<string, number>> {
  const rows = await tx
    .select({ assetId: placements.assetId })
    .from(placements)
    .where(eq(placements.islandId, islandId))
    .limit(2000);
  const counts = new Map<string, number>();
  for (const row of rows)
    counts.set(row.assetId, (counts.get(row.assetId) ?? 0) + 1);
  return counts;
}

export async function countPlacements(
  tx: DbOrTx,
  islandId: string,
): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(placements)
    .where(eq(placements.islandId, islandId));
  return row?.value ?? 0;
}
