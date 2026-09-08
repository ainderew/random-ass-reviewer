import { hashString } from '@/domain/world/hash';

export interface Rng {
  // Uniform in [0, 1).
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(entries: ReadonlyArray<{ item: T; weight: number }>): T;
}

// mulberry32, seeded from a string hash. Deterministic: the same seed gives
// the same sequence, which is what makes every loot roll testable and every
// repeated request return the same cache. Never Math.random() here.
export function createRng(seed: string): Rng {
  let state = hashString(seed) || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => {
      if (items.length === 0) throw new Error('pick from empty list');
      return items[Math.floor(next() * items.length)]!;
    },
    weighted: (entries) => {
      const total = entries.reduce((sum, e) => sum + Math.max(0, e.weight), 0);
      if (total <= 0) throw new Error('weighted with no positive weights');
      let roll = next() * total;
      for (const entry of entries) {
        roll -= Math.max(0, entry.weight);
        if (roll < 0) return entry.item;
      }
      return entries[entries.length - 1]!.item;
    },
  };
}
