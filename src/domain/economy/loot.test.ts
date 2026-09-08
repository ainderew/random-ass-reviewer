import { lootPoolFor, rarityWeightsFor, rollCache } from './loot';
import { MIN_MS_FOR_CACHE, PITY_THRESHOLD, RARITY_ORDER } from './loot-tables';
import { createRng } from './rng';

const minutes = (n: number) => n * 60_000;
const base = {
  creditedMs: minutes(25),
  pityCounter: 0,
  ownedAssetIds: [] as string[],
};

describe('rollCache', () => {
  it('returns null under fifteen minutes', () => {
    expect(
      rollCache({ ...base, seed: 's', creditedMs: MIN_MS_FOR_CACHE - 1 }),
    ).toBeNull();
    expect(
      rollCache({ ...base, seed: 's', creditedMs: MIN_MS_FOR_CACHE }),
    ).not.toBeNull();
  });

  it('is deterministic for the same inputs', () => {
    const a = rollCache({ ...base, seed: 'fixed-seed' });
    const b = rollCache({ ...base, seed: 'fixed-seed' });
    expect(a).toEqual(b);
  });

  it('forces rare or better once the pity counter hits the threshold', () => {
    for (let i = 0; i < 200; i += 1) {
      const roll = rollCache({
        ...base,
        seed: `pity-${i}`,
        pityCounter: PITY_THRESHOLD,
      })!;
      expect(RARITY_ORDER[roll.rarity]).toBeGreaterThanOrEqual(
        RARITY_ORDER.rare,
      );
      expect(roll.nextPityCounter).toBe(0);
    }
  });

  it('increments the pity counter on common and uncommon rolls', () => {
    const rng = createRng('walk');
    for (let i = 0; i < 100; i += 1) {
      const roll = rollCache({
        ...base,
        seed: `walk-${rng.next()}`,
        pityCounter: 3,
      })!;
      if (RARITY_ORDER[roll.rarity] < RARITY_ORDER.rare)
        expect(roll.nextPityCounter).toBe(4);
      else expect(roll.nextPityCounter).toBe(0);
    }
  });

  it('guarantees at least one rare-or-better within twelve consecutive caches', () => {
    for (let run = 0; run < 300; run += 1) {
      let pity = 0;
      let sawRare = false;
      for (let i = 0; i < PITY_THRESHOLD + 1; i += 1) {
        const roll = rollCache({
          ...base,
          seed: `run-${run}-cache-${i}`,
          pityCounter: pity,
        })!;
        pity = roll.nextPityCounter;
        if (RARITY_ORDER[roll.rarity] >= RARITY_ORDER.rare) sawRare = true;
      }
      expect(sawRare).toBe(true);
    }
  });

  it('never hands out an owned asset while unowned ones remain', () => {
    const pool = lootPoolFor('rare');
    expect(pool.length).toBeGreaterThan(0);
    const [first, ...rest] = pool;
    for (let i = 0; i < 100; i += 1) {
      const roll = rollCache({
        ...base,
        seed: `owned-${i}`,
        pityCounter: PITY_THRESHOLD,
        ownedAssetIds: rest,
      })!;
      if (roll.rarity === 'rare')
        expect(roll.contents.assetIds).toEqual([first]);
    }
  });

  it('falls back to currency when everything at that rarity is owned', () => {
    const roll = rollCache({
      ...base,
      seed: 'all-owned',
      pityCounter: PITY_THRESHOLD,
      ownedAssetIds: [...lootPoolFor('rare'), ...lootPoolFor('epic')],
    })!;
    expect(roll.contents.assetIds).toEqual([]);
    expect(roll.contents.focus).toBeGreaterThan(120);
  });

  it('never produces an empty cache', () => {
    for (let i = 0; i < 500; i += 1) {
      const roll = rollCache({
        ...base,
        seed: `never-empty-${i}`,
        pityCounter: i % 14,
      })!;
      expect(
        roll.contents.focus +
          roll.contents.insight +
          roll.contents.assetIds.length,
      ).toBeGreaterThan(0);
      expect(roll.contents.focus).toBeGreaterThan(0);
    }
  });
});

describe('rarityWeightsFor', () => {
  it('caps the session-length bonus', () => {
    const short = rarityWeightsFor(minutes(20));
    const long = rarityWeightsFor(minutes(90));
    const marathon = rarityWeightsFor(minutes(600));
    const weight = (list: typeof short, item: string) =>
      list.find((e) => e.item === item)!.weight;
    expect(weight(long, 'rare')).toBeGreaterThan(weight(short, 'rare'));
    expect(weight(marathon, 'rare')).toBe(weight(long, 'rare'));
    expect(weight(marathon, 'epic')).toBe(weight(long, 'epic'));
  });
});
