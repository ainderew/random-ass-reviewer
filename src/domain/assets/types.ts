import type { Rarity } from '@/domain/types/cache';

// terrain: the island base. prop/building: placeable. actor: NPCs.
// landmark: fixed pieces that read real data, never placed by hand.
export const ASSET_CATEGORIES = [
  'terrain',
  'prop',
  'building',
  'actor',
  'landmark',
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const PLACEABLE_CATEGORIES: readonly AssetCategory[] = [
  'prop',
  'building',
];

export interface WindSettings {
  amplitude: number;
  speed: number;
}

// One record per optimised GLB. The generated manifest satisfies this shape;
// the AssetId union comes from its keys.
export interface AssetRecord {
  id: string;
  label: string;
  url: string;
  bytes: number;
  triangles: number;
  category: AssetCategory;
  footprint: readonly [number, number];
  priceFocus: number;
  priceInsight: number;
  rarity: Rarity;
  // Starter pieces open at this level. Won pieces ignore it.
  minLevel: number;
  wind?: WindSettings;
}

// Hard budgets. The optimise script refuses to emit anything over them.
export const MAX_ASSET_BYTES = 150 * 1024;
export const MAX_ASSET_TRIANGLES = 5000;
