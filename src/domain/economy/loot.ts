import { ASSET_IDS, ASSET_MANIFEST } from '@/domain/assets/manifest.generated';
import { PLACEABLE_CATEGORIES } from '@/domain/assets/types';
import type { CacheContents, Rarity } from '@/domain/types/cache';
import {
  CACHE_FOCUS,
  CURRENCY_FALLBACK_FOCUS,
  EPIC_BONUS_CAP,
  EPIC_BONUS_PER_STEP,
  LENGTH_BONUS_START_MS,
  LENGTH_BONUS_STEP_MS,
  MIN_MS_FOR_CACHE,
  PITY_THRESHOLD,
  RARE_BONUS_CAP,
  RARE_BONUS_PER_STEP,
  RARITY_ORDER,
  RARITY_WEIGHTS,
} from './loot-tables';
import { createRng, type Rng } from './rng';

export interface CacheRoll {
  rarity: Rarity;
  contents: CacheContents;
  nextPityCounter: number;
}

function lengthSteps(creditedMs: number): number {
  if (creditedMs <= LENGTH_BONUS_START_MS) return 0;
  return Math.floor(
    (creditedMs - LENGTH_BONUS_START_MS) / LENGTH_BONUS_STEP_MS,
  );
}

export function rarityWeightsFor(
  creditedMs: number,
): ReadonlyArray<{ item: Rarity; weight: number }> {
  const steps = lengthSteps(creditedMs);
  const rareBonus = Math.min(RARE_BONUS_CAP, steps * RARE_BONUS_PER_STEP);
  const epicBonus = Math.min(EPIC_BONUS_CAP, steps * EPIC_BONUS_PER_STEP);
  return RARITY_WEIGHTS.map((entry) => {
    if (entry.item === 'rare')
      return { item: entry.item, weight: entry.weight + rareBonus };
    if (entry.item === 'epic')
      return { item: entry.item, weight: entry.weight + epicBonus };
    return entry;
  });
}

export function rollRarity(
  rng: Rng,
  input: { creditedMs: number; pityCounter: number },
): Rarity {
  const rolled = rng.weighted(rarityWeightsFor(input.creditedMs));
  if (
    input.pityCounter >= PITY_THRESHOLD &&
    RARITY_ORDER[rolled] < RARITY_ORDER.rare
  ) {
    return 'rare';
  }
  return rolled;
}

// Cosmetic assets a cache of this rarity can hold, in a stable order.
export function lootPoolFor(rarity: Rarity): string[] {
  return ASSET_IDS.filter((id) => {
    const asset = ASSET_MANIFEST[id];
    return (
      asset.rarity === rarity && PLACEABLE_CATEGORIES.includes(asset.category)
    );
  });
}

// Rolled from the seed fixed at session start, so the outcome existed before
// the user could game it, and a repeat call returns the same cache.
export function rollCache(input: {
  seed: string;
  creditedMs: number;
  pityCounter: number;
  ownedAssetIds: ReadonlyArray<string>;
}): CacheRoll | null {
  if (input.creditedMs < MIN_MS_FOR_CACHE) return null;

  const rng = createRng(input.seed);
  const rarity = rollRarity(rng, input);
  const owned = new Set(input.ownedAssetIds);
  const unowned = lootPoolFor(rarity).filter((id) => !owned.has(id));

  const contents: CacheContents =
    unowned.length > 0
      ? {
          assetIds: [rng.pick(unowned)],
          focus: CACHE_FOCUS[rarity],
          insight: 0,
        }
      : {
          assetIds: [],
          focus: CACHE_FOCUS[rarity] + CURRENCY_FALLBACK_FOCUS[rarity],
          insight: 0,
        };

  const nextPityCounter =
    RARITY_ORDER[rarity] >= RARITY_ORDER.rare ? 0 : input.pityCounter + 1;
  return { rarity, contents, nextPityCounter };
}
