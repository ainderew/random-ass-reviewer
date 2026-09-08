import type { Rarity } from '@/domain/types/cache';

// Roughly one cache in twelve is exciting. Variable ratio, never the base pay.
export const RARITY_WEIGHTS: ReadonlyArray<{ item: Rarity; weight: number }> = [
  { item: 'common', weight: 62 },
  { item: 'uncommon', weight: 27 },
  { item: 'rare', weight: 9 },
  { item: 'epic', weight: 2 },
];

// Guaranteed rare or better within this many caches.
export const PITY_THRESHOLD = 12;

// No cache under fifteen minutes. Not an error, just no chest.
export const MIN_MS_FOR_CACHE = 15 * 60 * 1000;

// A cache is never empty. Every rarity pays some Focus on top of any asset.
export const CACHE_FOCUS: Record<Rarity, number> = {
  common: 20,
  uncommon: 50,
  rare: 120,
  epic: 300,
};

// Extra Focus when the roll falls back to currency because everything at
// that rarity is already owned. A duplicate must never read as a failed roll.
export const CURRENCY_FALLBACK_FOCUS: Record<Rarity, number> = {
  common: 10,
  uncommon: 30,
  rare: 120,
  epic: 300,
};

// Longer sessions nudge the odds, capped so a marathon cannot be farmed.
export const LENGTH_BONUS_START_MS = 30 * 60 * 1000;
export const LENGTH_BONUS_STEP_MS = 15 * 60 * 1000;
export const RARE_BONUS_PER_STEP = 1;
export const RARE_BONUS_CAP = 4;
export const EPIC_BONUS_PER_STEP = 0.5;
export const EPIC_BONUS_CAP = 2;

export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
};
