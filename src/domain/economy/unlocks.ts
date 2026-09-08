import {
  ASSET_IDS,
  ASSET_MANIFEST,
  type AssetId,
} from '@/domain/assets/manifest.generated';
import { PLACEABLE_CATEGORIES } from '@/domain/assets/types';
import { RARITY_ORDER } from './loot-tables';

// Rare and epic pieces are won, never bought. Everything else opens by level.
export function isStarterAsset(id: AssetId): boolean {
  const asset = ASSET_MANIFEST[id];
  return (
    PLACEABLE_CATEGORIES.includes(asset.category) &&
    RARITY_ORDER[asset.rarity] < RARITY_ORDER.rare
  );
}

export function starterAssetIds(): AssetId[] {
  return ASSET_IDS.filter(isStarterAsset);
}

export type Availability = 'available' | 'locked-level' | 'locked-won';

export function assetAvailability(input: {
  assetId: AssetId;
  level: number;
  ownedAssetIds: ReadonlySet<string>;
}): Availability {
  const asset = ASSET_MANIFEST[input.assetId];
  if (!isStarterAsset(input.assetId) && !input.ownedAssetIds.has(input.assetId))
    return 'locked-won';
  if (asset.minLevel > input.level) return 'locked-level';
  return 'available';
}

// Labels of what a level opens, so a level-up can say something concrete.
export function unlocksForLevel(level: number): string[] {
  return ASSET_IDS.filter(
    (id) => isStarterAsset(id) && ASSET_MANIFEST[id].minLevel === level,
  ).map((id) => ASSET_MANIFEST[id].label);
}
