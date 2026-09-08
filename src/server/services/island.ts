import { ASSET_MANIFEST, isAssetId } from '@/domain/assets/manifest.generated';
import {
  checkPlacement,
  normalizeRotation,
  occupiedTileKeys,
  type Footprint,
} from '@/domain/island/grid';
import { assetAvailability } from '@/domain/economy/unlocks';
import { describePrice, refundForRemoval } from '@/domain/island/pricing';
import type {
  IslandView,
  PlaceAssetResponse,
  RemovePlacementResponse,
  WorldSignals,
} from '@/domain/types';
import { db } from '@/server/db';
import { isUniqueViolation } from '@/server/db/errors';
import { AppError } from '@/server/errors';
import { getOwnership } from './inventory';
import { toPublicStats } from './user-stats';
import { sumCreditedAllTime } from '@/server/repositories/focus-session';
import {
  deletePlacement,
  findIslandByUserId,
  findPlacementById,
  insertPlacement,
  listPlacements,
} from '@/server/repositories/island';
import { findUserById } from '@/server/repositories/user';
import {
  debitBalances,
  findUserStats,
  incrementBalances,
} from '@/server/repositories/user-stats';

// A 9x9 island holds 81 tiles. Expansions stay well under this.
const MAX_PLACEMENTS = 500;

function footprintOf(assetId: string): Footprint {
  return isAssetId(assetId) ? ASSET_MANIFEST[assetId].footprint : [1, 1];
}

// Real study history the island renders as props (the study shelf).
export async function getWorldSignals(userId: string): Promise<WorldSignals> {
  const [creditedMs, stats] = await Promise.all([
    sumCreditedAllTime(db, userId),
    findUserStats(db, userId),
  ]);
  return {
    totalFocusHours: creditedMs / 3_600_000,
    // Phase 6 fills this from note sources.
    distinctSubjects: [],
    longestStreak: stats?.streakDays ?? 0,
  };
}

export async function getIslandView(userId: string): Promise<IslandView> {
  const island = await findIslandByUserId(db, userId);
  if (!island) throw new AppError('NOT_FOUND', 'Island not found');
  const [placements, user, signals, ownership] = await Promise.all([
    listPlacements(db, island.id, { limit: MAX_PLACEMENTS }),
    findUserById(db, userId),
    getWorldSignals(userId),
    getOwnership(db, userId, island.id),
  ]);
  return {
    island,
    placements,
    timeZone: user?.timezone ?? 'UTC',
    signals,
    ownedAssetIds: ownership.ownedAssetIds,
    freeCredits: ownership.freeCredits,
  };
}

// One transaction: bounds, occupancy, conditional debit, insert. The unique
// index on (island_id, x, z) is the backstop for two clicks racing past the
// occupancy query; it surfaces here as INVALID_STATE after a full rollback.
export async function placeAsset(input: {
  userId: string;
  assetId: string;
  x: number;
  z: number;
  rotY: number;
}): Promise<PlaceAssetResponse> {
  if (!isAssetId(input.assetId))
    throw new AppError('VALIDATION', 'Unknown asset');
  const asset = ASSET_MANIFEST[input.assetId];
  if (asset.category !== 'prop' && asset.category !== 'building') {
    throw new AppError('VALIDATION', 'That cannot be placed');
  }
  const rotY = normalizeRotation(input.rotY);

  try {
    return await db.transaction(async (tx) => {
      const island = await findIslandByUserId(tx, input.userId);
      if (!island) throw new AppError('NOT_FOUND', 'Island not found');

      // Won pieces need to have been won; starters open by level. A won copy
      // that is not yet placed costs nothing.
      const [ownership, current] = await Promise.all([
        getOwnership(tx, input.userId, island.id),
        findUserStats(tx, input.userId),
      ]);
      if (!current) throw new AppError('NOT_FOUND', 'User stats not found');
      const availability = assetAvailability({
        assetId: asset.id,
        level: current.level,
        ownedAssetIds: new Set(ownership.ownedAssetIds),
      });
      if (availability === 'locked-won')
        throw new AppError('VALIDATION', 'That piece has to be won');
      if (availability === 'locked-level') {
        throw new AppError('VALIDATION', `Opens at level ${asset.minLevel}`);
      }
      const free = (ownership.freeCredits[input.assetId] ?? 0) > 0;

      const existing = await listPlacements(tx, island.id, {
        limit: MAX_PLACEMENTS,
      });
      const occupied = occupiedTileKeys(
        existing.map((p) => ({
          x: p.x,
          z: p.z,
          rotY: p.rotY,
          footprint: footprintOf(p.assetId),
        })),
      );
      const verdict = checkPlacement({
        origin: { x: input.x, z: input.z },
        footprint: asset.footprint,
        rotY,
        tileCount: island.tileCount,
        occupied,
      });
      if (!verdict.ok) {
        throw verdict.reason === 'OUT_OF_BOUNDS'
          ? new AppError('VALIDATION', 'That is outside the island')
          : new AppError('INVALID_STATE', 'That tile is taken');
      }

      const stats = free
        ? current
        : await debitBalances(tx, input.userId, {
            focus: asset.priceFocus,
            insight: asset.priceInsight,
          });
      if (!stats)
        throw new AppError(
          'INSUFFICIENT_FUNDS',
          `Needs ${describePrice(asset)}`,
        );

      const placement = await insertPlacement(tx, {
        islandId: island.id,
        assetId: asset.id,
        x: input.x,
        z: input.z,
        rotY,
      });
      return { placement, stats: toPublicStats(stats) };
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new AppError('INVALID_STATE', 'That tile was just taken');
    throw error;
  }
}

export async function removePlacement(input: {
  userId: string;
  placementId: string;
}): Promise<RemovePlacementResponse> {
  return db.transaction(async (tx) => {
    const island = await findIslandByUserId(tx, input.userId);
    if (!island) throw new AppError('NOT_FOUND', 'Island not found');

    const placement = await findPlacementById(tx, {
      islandId: island.id,
      placementId: input.placementId,
    });
    if (!placement) throw new AppError('NOT_FOUND', 'Nothing there to remove');

    await deletePlacement(tx, {
      islandId: island.id,
      placementId: placement.id,
    });
    const price = isAssetId(placement.assetId)
      ? ASSET_MANIFEST[placement.assetId]
      : { priceFocus: 0, priceInsight: 0 };
    const refund = refundForRemoval(price);
    const stats = await incrementBalances(tx, input.userId, refund);
    return { refund, stats: toPublicStats(stats) };
  });
}
